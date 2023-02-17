import { Component } from 'preact';
import { data } from '../index';
import { LtnAvailability } from '../ltn-avail';
import { ItemIcon } from '../lists';
import { BlockLine, Item, RecipeInOut } from '../objects';
import { objToColon } from '../muffler/colon';
import {
  colonMapCombinator,
  colonMapItems,
  ltnMinTransfer,
  settingsMap,
  stations,
} from '../muffler/stations';
import { humanise } from '../muffler/human';

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

    const colon = objToColon(props);

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
        <h3>LTN availability:</h3>
        <LtnProvides colon={colon} />
        <h3>LTN requests:</h3>
        <LtnRequests colon={colon} />
        <h3>Storage:</h3>
        <Storage type={props.type} name={props.name} />
        <h3>Ways to make:</h3>
        <RecipeUsage type={props.type} name={props.name} />
      </div>
    );
  }
}

class LtnProvides extends Component<{ colon: string }> {
  render(props: { colon: string }) {
    const providers = stations()
      .flatMap(([loc, stop]) => {
        const actualItemsAvailable = colonMapItems(stop)[props.colon];
        if (!(actualItemsAvailable > 0)) {
          return [];
        }

        const settings = settingsMap(stop);
        const min = ltnMinTransfer(props.colon, settings);
        return [[[loc, stop], actualItemsAvailable, min] as const];
      })
      .sort(
        ([, avalue, amin], [, bvalue, bmin]) => bvalue / bmin - avalue / amin,
      );

    return (
      <table className="ltn-avail">
        {providers.map(([stop, value, min]) => (
          <LtnAvailability stop={stop} avail={value} min={min} />
        ))}
      </table>
    );
  }
}

class LtnRequests extends Component<{ colon: string }> {
  render(props: { colon: string }) {
    const requests = stations()
      .flatMap(([loc, stop]) => {
        const wantedItems = colonMapCombinator(stop)[props.colon];
        if (!(wantedItems < 0)) {
          return [];
        }
        const computed = colonMapItems(stop)[props.colon];

        const actualMinusWanted = computed ?? 0;
        // want 100: wanted = -100
        // actualMinusWanted -80 means there's 20 real items
        // percentage satisfaction: 20/100 = 20%
        return [
          [[loc, stop], actualMinusWanted - wantedItems, -wantedItems] as const,
        ];
      })
      .sort(
        ([, avalue, awanted], [, bvalue, bwanted]) =>
          avalue / awanted - bvalue / bwanted,
      );
    return (
      <table className="ltn-avail">
        {requests.map(([stop, value, wanted]) => (
          <LtnAvailability
            stop={stop}
            avail={value}
            min={wanted}
            decimate={true}
          />
        ))}
      </table>
    );
  }
}

class Storage extends Component<{ type: 'item' | 'fluid'; name: string }> {
  render(props: { type: 'item' | 'fluid'; name: string }) {
    return (
      <ul>
        {Object.entries(data.doc)
          .map(
            ([no, brick]) => [no, brick[`${props.type}s`][props.name]] as const,
          )
          .filter(([, count]) => count > 0)
          .sort(([, a], [, b]) => b - a)
          .map(([no, count]) => (
            <li>
              {humanise(count)} in <BlockLine block={no} />
            </li>
          ))}
      </ul>
    );
  }
}

class RecipeUsage extends Component<{ type: string; name: string }> {
  render(props: { type: string; name: string }) {
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

    return recipes
      .sort(([a], [b]) => a.localeCompare(b))
      .sort(([a], [b]) => totalAssemblersMaking(b) - totalAssemblersMaking(a))
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
      });
  }
}
