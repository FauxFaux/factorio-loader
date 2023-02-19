import { Component } from 'preact';
import { computed, data } from '../index';
import { LtnAvailability } from '../ltn-avail';
import { ItemIcon } from '../lists';
import { BlockLine, Fluid, Item, ItemOrFluid } from '../objects';
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
    const stats = data.prodStats[colon];

    const barrelled =
      props.type === 'fluid' ? computed.fluidBarrel[props.name] : undefined;
    const unBarrelled =
      props.type === 'item' ? computed.barrelFluid[props.name] : undefined;

    return (
      <>
        <div class="row">
          <h2>
            <ItemIcon name={props.name} alt={props.name} /> {obj.localised_name}
          </h2>
          <p>
            type: <span className="font-monospace">{props.type}</span>;
            stack-size:
            <span className="font-monospace">
              {props.type === 'item'
                ? data.items[props.name].stack_size
                : 'fluid'}
            </span>
            ; internal-name:<span class="font-monospace">{props.name}</span>;
            group:
            <span class="font-monospace">{obj.group?.name}</span>; subgroup:
            <span class="font-monospace">{obj.subgroup?.name}</span>.
          </p>
        </div>
        {barrelled ? (
          <div class="row">
            <p>
              <span className="font-monospace">barrelled-form:</span>
              <ItemIcon name={barrelled} alt={barrelled} />{' '}
              <Item name={barrelled} />
            </p>
          </div>
        ) : (
          <></>
        )}
        {unBarrelled ? (
          <div class="row">
            <p>
              <span className="font-monospace">fluid-form:</span>
              <ItemIcon name={unBarrelled} alt={unBarrelled} />{' '}
              <Fluid name={unBarrelled} />
            </p>
          </div>
        ) : (
          <></>
        )}
        <div class="row">
          <div className="col">
            <h3>
              LTN availability (
              <a href={`/ltn-tree/${props.type}/${props.name}`}>debug</a>):
            </h3>
            <LtnProvides colon={colon} />
            <h3>LTN requests:</h3>
            <LtnRequests colon={colon} />
          </div>
          <div className="col">
            <h3>Storage:</h3>
            <Storage type={props.type} name={props.name} />
            <h3>
              Production stats{' '}
              {unBarrelled ? (
                <>
                  (see <Fluid name={unBarrelled} />)
                </>
              ) : (
                ''
              )}
            </h3>
            <table class="table prod-stats">
              <thead>
                <tr>
                  <th></th>
                  <th>Production</th>
                  <th>Consumption</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total</td>
                  <td>{humanise(stats?.input?.total)}</td>
                  <td>{humanise(stats?.output?.total)}</td>
                </tr>
                {['5s', '1m', '10m', '1h', '10h', '50h', '250h', '1000h'].map(
                  (x, i) => (
                    <tr>
                      <td>{x}</td>
                      <td>{humanise(stats?.input?.perTime?.[i])}/min</td>
                      <td>{humanise(stats?.output?.perTime?.[i])}/min</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="row">
          <h3>Recipes in use in factory, most assemblers first:</h3>
          <RecipeUsage type={props.type} name={props.name} />
        </div>
      </>
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
          ) ||
        undefined !==
          recipe.ingredients?.find(
            (ing) => ing.type === props.type && ing.name === props.name,
          ),
    );

    const inUse = new Set(recipes.map(([name]) => name));

    const dataByRecipe: Record<
      string,
      { asms: Record<string, number>; blocks: Set<string> }
    > = {};
    for (const [block, { asm }] of Object.entries(data.doc)) {
      for (const [label, count] of Object.entries(asm)) {
        const [machine, recipe] = label.split('\0');
        if (!inUse.has(recipe)) continue;
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

    const rows = recipes
      .filter(([a]) => totalAssemblersMaking(a) > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .sort(([a], [b]) => totalAssemblersMaking(b) - totalAssemblersMaking(a))
      .map(([name, recipe]) => {
        const counts = dataByRecipe[name];

        return (
          <tr>
            <td>
              {recipe.localised_name} (
              <span class="font-monospace">{name}</span>)
            </td>
            <td>
              <ul>
                {Object.entries(counts.asms).map(([machine, count]) => (
                  <li>
                    {count} * <Item name={machine} />
                  </li>
                ))}
              </ul>
            </td>
            <td>
              <ul>
                {[...counts.blocks].map((block) => (
                  <li>
                    <BlockLine block={block} />
                  </li>
                ))}
              </ul>
            </td>
            <td>
              <ul>
                {recipe.ingredients?.map((ing) => (
                  <li>
                    {ing.amount} *{' '}
                    <ItemOrFluid type={ing.type} name={ing.name} />
                  </li>
                ))}
              </ul>
            </td>
            <td>
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
            </td>
          </tr>
        );
      });

    return (
      <table class="table">
        <thead>
          <th>Recipe name</th>
          <th>Assemblers making</th>
          <th>Bricks</th>
          <th>Inputs</th>
          <th>Outputs</th>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
  }
}
