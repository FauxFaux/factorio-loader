import { Component } from 'preact';
import { BlockContent } from '../scripts/load-recs';
import { ColonJoined, Item, Recipe } from './objects';
import { GpsLink, RenderIcons } from './lists';
import { Coord, data } from './datae';
import {
  colonMapCombinator,
  colonMapItems,
  ltnMinTransfer,
  settingsMap,
} from './muffler/stations';
import { humanise } from './muffler/human';
import { compareWithoutIcons } from './muffler/names';
import { expActLtn, LtnFlow, LtnPercent } from './ltn-avail';

export function recipeDifference(brick: BlockContent) {
  const inputs: Set<string> = new Set();
  const outputs: Set<string> = new Set();
  for (const [label] of Object.entries(brick.asm)) {
    const [, recipe] = label.split('\0');
    const recp = data.recipes.regular[recipe];
    if (!recp) continue;

    for (const ing of recp.ingredients ?? []) {
      inputs.add(ing.colon);
    }

    for (const prod of recp.products ?? []) {
      outputs.add(prod.colon);
    }
  }

  if (brick.boilers > 0) {
    inputs.add('fluid:water');
    outputs.add('fluid:steam');
  }

  const wanted = [...inputs].filter((input) => !outputs.has(input));
  const exports = [...outputs].filter((output) => !inputs.has(output));

  return { wanted, exports };
}

export class Assemblers extends Component<{ brick: BlockContent }> {
  render(props: { brick: BlockContent }) {
    const sorted = Object.entries(props.brick.asm).sort(
      ([, { count: a }], [, { count: b }]) => b - a,
    );
    return (
      <>
        <ul>
          {sorted.map(([label, props]) => {
            const [, recipe] = label.split('\0');
            return (
              <li>
                <AssemblerCount label={label} props={props} />
                making <Recipe name={recipe} />
              </li>
            );
          })}
        </ul>
      </>
    );
  }
}

export const AssemblerCount = ({
  label,
  props,
}: {
  label: string;
  props: { count: number; locations: Coord[] };
}) => {
  const [machine, recipe] = label.split('\0');
  const machineName = data.items[machine]?.localised_name ?? machine;
  const recipeName = data.recipes.regular[recipe]?.localised_name ?? recipe;
  return (
    <>
      {props.locations.map((loc) => (
        <GpsLink caption={`a ${machineName} making ${recipeName}`} gps={loc} />
      ))}
      {props.count} &times; <Item name={machine} />{' '}
    </>
  );
};

export class TrainStops extends Component<{ stop: BlockContent['stop'] }> {
  render(props: { stop: BlockContent['stop'] }) {
    return (
      <table class="ltn-avail-block">
        {props.stop
          .sort((a, b) => compareWithoutIcons(a.name, b.name))
          .map((stop) => {
            const settings = settingsMap(stop);
            const items = colonMapItems(stop);
            const combinators = colonMapCombinator(stop);
            return (
              <>
                <tr>
                  <th colSpan={5}>
                    <b>
                      <GpsLink caption={stop.name} gps={stop.gps} />{' '}
                      <RenderIcons text={stop.name} />
                    </b>
                  </th>
                </tr>
                {Object.entries(items)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([colon, count]) => {
                    const req = combinators[colon];
                    if (req) {
                      const v = expActLtn(combinators, items, colon);
                      if (!v)
                        return (
                          <tr>
                            <td>ERROH {colon} isn't a combinator</td>
                          </tr>
                        );
                      const { actual, expected } = v;
                      return (
                        <tr>
                          <td title="import">➡</td>
                          <td> {humanise(actual)}</td>
                          <td>
                            <LtnPercent
                              actual={actual}
                              expected={expected}
                              decimate={true}
                            />
                          </td>
                          <td>
                            <LtnFlow
                              flows={{
                                totalFlow: data.prodStats[colon]?.ltn,
                                flow: stop.flowTo[colon],
                              }}
                            />
                          </td>
                          <td>
                            <ColonJoined colon={colon} />
                          </td>
                        </tr>
                      );
                    }
                    const expected = ltnMinTransfer(colon, settings);
                    return (
                      <tr>
                        <td title="export">️⬅</td>
                        <td>️{humanise(count)}</td>
                        <td>
                          <LtnPercent actual={count} expected={expected} />
                        </td>
                        <td>
                          <LtnFlow
                            flows={{
                              totalFlow: data.prodStats[colon]?.ltn,
                              flow: stop.flowFrom[colon],
                            }}
                          />
                        </td>
                        <td>
                          <ColonJoined colon={colon} />
                        </td>
                      </tr>
                    );
                  })}
              </>
            );
          })}
      </table>
    );
  }
}
