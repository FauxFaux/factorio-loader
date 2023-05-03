import { Component } from 'preact';
import { computed, Coord, data } from '../datae';
import { LtnProvides, LtnRequests } from '../ltn-avail';
import { ItemIcon } from '../lists';
import { BlockLine, ColonJoined, Fluid, Item } from '../objects';
import { Colon, objToColon, splitColon } from '../muffler/colon';
import { humanise } from '../muffler/human';
import {
  HowToMake,
  IngredientLine,
  ProductAmount,
} from '../components/how-to-make';
import { AssemblerCount } from '../block-renderers';

export class IoFDetail extends Component<{
  colon: Colon;
}> {
  render(props: { colon: Colon }) {
    const [kind, name] = splitColon(props.colon);
    const obj = (kind === 'item' ? data.items : data.fluids)[name];
    if (!obj)
      return (
        <span>
          unknown {kind} {name}
        </span>
      );

    const colon = props.colon;
    const stats = data.prodStats[colon];

    const barrelled = kind === 'fluid' ? computed.fluidBarrel[name] : undefined;
    const unBarrelled =
      kind === 'item' ? computed.barrelFluid[name] : undefined;

    const flowDia = data.flowDiagrams.includes(colon)
      ? `../data/flow-svgs/${colon.replace(':', '-')}.svg`
      : undefined;

    const blocksWith = Object.entries(data.doc).flatMap(([loc, block]) =>
      block.resources[name] ? [[loc, block.resources[name]] as const] : [],
    );

    const maxBlock = Math.max(...blocksWith.map(([, amount]) => amount));
    const initial = blocksWith.length;
    const shownBlocks = blocksWith.filter(
      ([, amount]) => amount >= maxBlock / 2,
    );

    const storage = (
      <>
        <h3>Storage:</h3>
        <Storage type={kind} name={name} />
        {Object.keys(blocksWith).length ? (
          <>
            <h3>Blocks with this resource:</h3>
            <ul>
              {shownBlocks
                .sort(([, a], [, b]) => b - a)
                .map(([loc, amount]) => (
                  <li>
                    {humanise(amount)}: <BlockLine block={loc} />
                  </li>
                ))}
              <li>... and {initial - shownBlocks.length} more.</li>
            </ul>
          </>
        ) : (
          <></>
        )}
      </>
    );

    const prodStats =
      unBarrelled || stats?.input?.total || stats?.output?.total ? (
        <>
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
        </>
      ) : (
        <h5>(production stats unavailable)</h5>
      );

    return (
      <>
        <div class="row">
          <h2>
            <ItemIcon name={name} alt={name} /> {obj.localised_name}
          </h2>
          <p>
            type: <span className="font-monospace">{kind}</span>; stack-size:
            <span className="font-monospace">
              {kind === 'item' ? data.items[name].stack_size : 'fluid'}
            </span>
            ; internal-name:<span class="font-monospace">{name}</span>; group:
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
          <p>
            Ways to <a href={`/an/produces/${colon}`}>produce</a> and{' '}
            <a href={`/an/consumes/${colon}`}>consume</a>.{' '}
            <a href={`/an/current-chain/${colon}`}>Current chain</a>.
          </p>
        </div>
        <div class="row">
          <div className="col">
            <h3>
              LTN availability (<a href={`/ltn-tree/${kind}/${name}`}>debug</a>
              ):
            </h3>
            <LtnProvides colon={colon} />
            <h3>LTN requests:</h3>
            <LtnRequests colon={colon} />
          </div>
          <div className="col">
            {storage}
            {prodStats}
          </div>
        </div>

        <div className="row">
          <h3>Recipes in use in factory, most assemblers first:</h3>
          <RecipeUsage type={kind} name={name} />
        </div>

        <div className="row">
          <h3>Proposed production chains:</h3>
          <HowToMake colon={colon} />
        </div>

        <div className="row">
          {flowDia ? (
            <a href={flowDia}>
              <img
                style="filter: invert(0.86); max-width: 100%"
                src={flowDia}
                alt="A (likely completely useless) LTN flow chat"
              />
            </a>
          ) : (
            <></>
          )}
        </div>
      </>
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
    const colon = objToColon(props);

    const recipes = Object.entries(data.recipes.regular).filter(
      ([, recipe]) =>
        undefined !== recipe.products.find((prod) => prod.colon === colon) ||
        undefined !== recipe.ingredients?.find((ing) => ing.colon === colon),
    );

    const executions: Record<string, number> = {};
    for (const dat of Object.values(data.cp.byPos)) {
      if (!dat.recipe || !dat.runs) continue;
      if (!(dat.recipe in executions)) {
        executions[dat.recipe] = 0;
      }
      executions[dat.recipe] += dat.runs.reduce((a, b) => a + b, 0);
    }

    const inUse = new Set(recipes.map(([name]) => name));

    const dataByRecipe: Record<
      string,
      {
        asms: Record<string, { count: number; locations: Coord[] }>;
        blocks: Set<string>;
      }
    > = {};
    for (const [block, { asm }] of Object.entries(data.doc)) {
      for (const [label, { count }] of Object.entries(asm)) {
        const [machine, recipe] = label.split('\0');
        if (!inUse.has(recipe)) continue;
        if (!dataByRecipe[recipe])
          dataByRecipe[recipe] = { asms: {}, blocks: new Set() };
        const d = dataByRecipe[recipe];
        if (!d.asms[machine]) d.asms[machine] = { count: 0, locations: [] };
        d.asms[machine].count += count;
        d.asms[machine].locations.push(...asm[label].locations);
        d.blocks.add(block);
      }
    }

    function totalAssemblersMaking(a: string) {
      return Object.values(dataByRecipe[a]?.asms ?? {}).reduce(
        (prev, curr) => prev + curr.count,
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
              {recipe.localised_name}
              <br />
              <span class="font-monospace">{name}</span>
              <br />
              {executions[name] ?? 0}
            </td>
            <td>
              <ul>
                {Object.entries(counts.asms).map(([machine, props]) => (
                  <li>
                    {/*'machine' here lacks the 'label' properties so we get a bit garbage out*/}
                    <AssemblerCount label={machine} props={props} />
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
                    <IngredientLine ing={ing} />
                  </li>
                ))}
              </ul>
            </td>
            <td>
              <ul>
                {recipe.products?.map((prod) => {
                  return (
                    <li>
                      <ProductAmount product={prod} /> *{' '}
                      <ColonJoined colon={prod.colon} />
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
          <tr>
            <th>Recipe name</th>
            <th>Assemblers making</th>
            <th>Bricks</th>
            <th>Inputs</th>
            <th>Outputs</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
  }
}
