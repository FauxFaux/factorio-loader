import { Component, ComponentChild, createRef } from 'preact';
import { data } from './index';
import { ItemIcon } from './lists';

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
    if (type === 'item' || type === 'fluid')
      return <ItemOrFluid type={type} name={name} />;
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
      <abbr
        class="fluid"
        data-bs-toggle="tooltip"
        title={`fluid ${props.name}`}
      >
        {fluid.localised_name}
      </abbr>
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

    return (
      <div class="container-fluid">
        <h2>{obj.localised_name}</h2>
        <p>Type: {props.type}</p>
        <p>
          Icon: <ItemIcon name={props.name} alt={props.name} />
        </p>
        <p>Internal name: {props.name}</p>
        <p>
          Group: {obj.group?.name}, subgroup: {obj.subgroup?.name}
        </p>
        <p>
          Storage:{' '}
          <ul>
            {Object.entries(data.doc)
              .map(([no, brick]) => [no, brick.items[props.name]] as const)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([no, count]) => (
                <li>
                  {humanise(count)} in <BlockLine block={no} />
                </li>
              ))}
          </ul>
        </p>
        <p>Ways to make:</p>
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
                  <h3>
                    {recipe.localised_name} (
                    <span class="font-monospace">{name}</span>)
                  </h3>
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

export function humanise(count: number) {
  if (count > 1e6)
    return <abbr title={`${count}`}>{(count / 1e6).toFixed() + 'M'}</abbr>;
  if (count > 1e3)
    return <abbr title={`${count}`}>{(count / 1e3).toFixed() + 'k'}</abbr>;
  return count;
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
