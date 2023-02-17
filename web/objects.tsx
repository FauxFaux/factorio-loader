import { Component, ComponentChild, createRef } from 'preact';
import { data } from './index';
import { ItemIcon } from './lists';
import {
  colonMapCombinator,
  colonMapItems,
  ltnMinTransfer,
  objToColon,
  settingsMap,
  Stat,
  stations,
  StopLine,
} from './station-status';
import { Measurement } from './ltn-summary';

export interface JItem {
  group: { name: string };
  subgroup: { name: string };
  localised_name: string;
  stack_size: number;
  type: 'item' | 'module' | 'tool' | unknown;
  wire_count: number;
}

export interface JFluid {
  group: { name: string };
  subgroup: { name: string };
  localised_name: string;
}

export interface JIngredient {
  amount: number;
  name: string;
  type: 'item' | 'fluid';
}

export interface JProduct {
  amount: number;
  name: string;
  type: 'item' | 'fluid';
  probability?: number;
}

export interface JRecipe {
  category: string;
  ingredients: JIngredient[];
  products: JProduct[];
  localised_name: string;
}

export class Recipe extends Component<{ name: string }, { expando?: boolean }> {
  render(
    props: { name: string },
    state: { expando?: boolean },
  ): ComponentChild {
    if (!props.name || props.name === 'undefined')
      return <span>nothing at all (nothing at all)</span>;
    const recipe = data.recipes[props.name];
    if (!recipe) return <span class="error">UNKNOWN RECIPE {props.name}</span>;
    if (!state.expando)
      return (
        <abbr
          class="recipe"
          title={`${props.name} (${recipe.ingredients?.length} -> ${recipe.products?.length})`}
          onClick={() => {
            this.setState({ expando: true });
          }}
        >
          {recipe.localised_name}
        </abbr>
      );
    return (
      <p
        onClick={() => {
          this.setState({ expando: false });
        }}
      >
        <h4>{recipe.localised_name}</h4>
        <RecipeInOut name={props.name} />
      </p>
    );
  }
}

export class RecipeInOut extends Component<{ name: string }> {
  render(props: { name: string }) {
    const recipe = data.recipes[props.name];
    if (!recipe) throw new Error(`unknown recipe: ${recipe}`);

    return (
      <div>
        Ingredients:
        <ul>
          {recipe.ingredients?.map((ing) => (
            <li>
              {ing.amount} * <ItemOrFluid type={ing.type} name={ing.name} />
            </li>
          ))}
        </ul>
        Products:
        <ul>
          {recipe.products?.map((prod) => {
            let statSuffix = '';
            if (prod.probability && prod.probability !== 1) {
              statSuffix = ` @ ${prod.probability * 100}%`;
            }
            return (
              <li>
                {prod.amount} *{' '}
                <ItemOrFluid type={prod.type} name={prod.name} />
                {statSuffix}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

export class ColonJoined extends Component<{ label: string }> {
  render(props: { label: string }) {
    const [type, name] = props.label.split(':', 2);
    if (type === 'item' || type === 'fluid') {
      return (
        <span>
          <ItemIcon name={name} alt={name} />{' '}
          <ItemOrFluid type={type} name={name} />
        </span>
      );
    }
    return (
      <span>
        <i>{type}</i>: {name}
      </span>
    );
  }
}

export class ItemOrFluid extends Component<{
  name: string;
  type: 'item' | 'fluid';
}> {
  render(props: { name: string; type: 'item' | 'fluid' }): ComponentChild {
    switch (props.type) {
      case 'item':
        return <Item name={props.name} />;
      case 'fluid':
        return <Fluid name={props.name} />;
      default:
        throw new Error(`impossible item type: ${props.type}`);
    }
  }
}

export class Item extends Component<{ name: string }, {}> {
  ref = createRef();

  render(props: { name: string }): ComponentChild {
    const item = data.items[props.name];
    if (!item) return <span class="error">UNKNOWN ITEM {props.name}</span>;

    // this works at a JS level but the UI library seems to give up if you have more than like THREE
    // useEffect(() => new Tooltip(this.ref.current).dispose, [this.ref]);

    return (
      <a
        ref={this.ref}
        href={`/item/${props.name}`}
        class="item"
        data-bs-toggle="tooltip"
        title={`item ${props.name} (${item.stack_size})`}
      >
        {item.localised_name}
      </a>
    );
  }
}

export class Fluid extends Component<{ name: string }, {}> {
  render(props: { name: string }): ComponentChild {
    const fluid = data.fluids[props.name];
    if (!fluid) return <span class="error">UNKNOWN FLUID {props.name}</span>;

    return (
      <a
        class="fluid"
        data-bs-toggle="tooltip"
        href={`/fluid/${props.name}`}
        title={`fluid ${props.name}`}
      >
        {fluid.localised_name}
      </a>
    );
  }
}

export class IoFDetail extends Component<{
  name: string;
  type: 'item' | 'fluid';
}> {
  render(props: { name: string; type: 'item' | 'fluid' }) {
    const obj = (props.type === 'item' ? data.items : data.fluids)[props.name];
    if (!obj)
      return (
        <span>
          unknown {props.type} {props.name}
        </span>
      );

    const recipes = Object.entries(data.recipes).filter(
      ([, recipe]) =>
        undefined !==
        recipe.products.find(
          (prod) => prod.type === props.type && prod.name === props.name,
        ),
    );

    const dataByRecipe: Record<
      string,
      { asms: Record<string, number>; blocks: Set<string> }
    > = {};
    for (const [block, { asm }] of Object.entries(data.doc)) {
      for (const [label, count] of Object.entries(asm)) {
        const [machine, recipe] = label.split('\0');
        // TODO: comically inefficient
        if (!recipes.map(([name]) => name).includes(recipe)) continue;
        if (!dataByRecipe[recipe])
          dataByRecipe[recipe] = { asms: {}, blocks: new Set() };
        const d = dataByRecipe[recipe];
        if (!d.asms[machine]) d.asms[machine] = 0;
        d.asms[machine] += count;
        d.blocks.add(block);
      }
    }

    function totalAssemblersMaking(a: string) {
      return Object.values(dataByRecipe[a]?.asms ?? {}).reduce(
        (prev, curr) => prev + curr,
        0,
      );
    }

    const colon = objToColon(props);
    const providers = stations().flatMap(([loc, stop]) => {
      const actualItemsAvailable = colonMapItems(stop)[colon];
      if (!(actualItemsAvailable > 0)) {
        return [];
      }

      const settings = settingsMap(stop);
      const min = ltnMinTransfer(colon, settings);
      return [[[loc, stop], actualItemsAvailable, min] as const];
    });
    const requests = stations().flatMap(([loc, stop]) => {
      const wantedItems = colonMapCombinator(stop)[colon];
      if (!(wantedItems < 0)) {
        return [];
      }
      const computed = colonMapItems(stop)[colon];

      const actualMinusWanted = computed ?? 0;
      // want 100: wanted = -100
      // actualMinusWanted -80 means there's 20 real items
      // percentage satisfaction: 20/100 = 20%
      return [
        [[loc, stop], actualMinusWanted - wantedItems, -wantedItems] as const,
      ];
    });
    const storage = (
      <p>
        <h3>LTN availability:</h3>
        <table className="ltn-avail">
          {providers
            .sort(
              ([, avalue, amin], [, bvalue, bmin]) =>
                bvalue / bmin - avalue / amin,
            )
            .map(([stop, value, min]) => (
              <LtnAvailability stop={stop} avail={value} min={min} />
            ))}
        </table>
        <h3>LTN requests:</h3>
        <table className="ltn-avail">
          {requests
            .sort(
              ([, avalue, awanted], [, bvalue, bwanted]) =>
                avalue / awanted - bvalue / bwanted,
            )
            .map(([stop, value, wanted]) => (
              <LtnAvailability
                stop={stop}
                avail={value}
                min={wanted}
                decimate={true}
              />
            ))}
        </table>
        <h3>Storage:</h3>
        <ul>
          {Object.entries(data.doc)
            .map(
              ([no, brick]) =>
                [no, brick[`${props.type}s`][props.name]] as const,
            )
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([no, count]) => (
              <li>
                {humanise(count)} in <BlockLine block={no} />
              </li>
            ))}
        </ul>
      </p>
    );

    return (
      <div class="container-fluid">
        <h2>
          <ItemIcon name={props.name} alt={props.name} /> {obj.localised_name}
        </h2>
        <p>
          type: <span className="font-monospace">{props.type}</span>;
          internal-name:<span class="font-monospace">{props.name}</span>; group:
          <span class="font-monospace">{obj.group?.name}</span>; subgroup:
          <span class="font-monospace">{obj.subgroup?.name}</span>.
        </p>
        <p>
          <a href={`/ltn-tree/${props.type}/${props.name}`}>
            Debug availability
          </a>
        </p>
        {storage}
        <h3>Ways to make:</h3>
        <p>
          {recipes
            .sort(([a], [b]) => a.localeCompare(b))
            .sort(
              ([a], [b]) => totalAssemblersMaking(b) - totalAssemblersMaking(a),
            )
            .map(([name, recipe]) => {
              const counts = dataByRecipe[name];

              let inUse;
              if (counts) {
                inUse = (
                  <p>
                    Factory is using this recipe in:
                    <ul>
                      {Object.entries(counts.asms).map(([machine, count]) => (
                        <li>
                          {count} * <Item name={machine} />
                        </li>
                      ))}
                    </ul>
                    In these blocks:
                    <ul>
                      {[...counts.blocks].map((block) => (
                        <li>
                          <BlockLine block={block} />
                        </li>
                      ))}
                    </ul>
                  </p>
                );
              } else {
                inUse = 'Factory does not use this recipe';
              }

              return (
                <p>
                  <h5>
                    {recipe.localised_name} (
                    <span class="font-monospace">{name}</span>)
                  </h5>
                  <p>{inUse}</p>
                  <RecipeInOut name={name} />
                </p>
              );
            })}
        </p>
      </div>
    );
  }
}

interface LtnAvailabilityProps {
  stop: Stat;

  /** how much is available right now */
  avail: number;

  /** how much LTN is waiting for */
  min: number;

  /** colour at 1/10th */
  decimate?: boolean;
}
export class LtnAvailability extends Component<LtnAvailabilityProps> {
  render(props: LtnAvailabilityProps) {
    return (
      <tr>
        <td>{humanise(props.avail)}</td>
        <td>
          <LtnPercent
            actual={props.avail}
            expected={props.min}
            decimate={props.decimate}
          />{' '}
        </td>
        <td>
          <StopLine stop={props.stop} />
        </td>
      </tr>
    );
  }
}

export const LtnPercent = (props: Measurement & { decimate?: boolean }) => {
  const health = (props.actual / props.expected) * 100;
  const dec = props.decimate ? 10 : 1;
  return (
    <abbr
      className={`ltn-health-${
        health < 100 / dec ? 'red' : health > 300 / dec ? 'green' : 'yellow'
      }`}
      title={`${humaniseNo(props.actual)} available / ${humaniseNo(
        props.expected,
      )} expected`}
    >
      {health.toLocaleString('en', { maximumFractionDigits: 0 })}%
    </abbr>
  );
};

export function humaniseNo(count: number): string {
  if (count > 1e6)
    return (
      (count / 1e6).toLocaleString('en', { maximumFractionDigits: 0 }) + 'M'
    );
  if (count > 1e3)
    return (
      (count / 1e3).toLocaleString('en', { maximumFractionDigits: 0 }) + 'k'
    );
  return count.toLocaleString('en', { maximumFractionDigits: 0 });
}

export function humanise(count: number) {
  if (count > 1e6)
    return (
      <abbr
        title={`${count.toLocaleString('en', { maximumFractionDigits: 0 })}`}
      >
        {(count / 1e6).toFixed() + 'M'}
      </abbr>
    );
  if (count > 1e3)
    return (
      <abbr
        title={`${count.toLocaleString('en', { maximumFractionDigits: 0 })}`}
      >
        {(count / 1e3).toFixed() + 'k'}
      </abbr>
    );
  return <abbr title="just a piddly digit">{count}</abbr>;
}

class BlockLine extends Component<{ block: string }> {
  render(props: { block: string }) {
    return (
      <span>
        <a href={'/block/' + props.block}>{props.block}</a> (
        {data.doc[props.block].tags.sort().join(', ')})
      </span>
    );
  }
}
