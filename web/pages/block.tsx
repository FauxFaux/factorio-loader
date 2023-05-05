import { Component } from 'preact';

import { ColonJoined, Item, TagList } from '../objects';
import { Assemblers, recipeDifference, TrainStops } from '../block-renderers';
import { data } from '../datae';
import { humanise } from '../muffler/human';
import { BlockThumb } from './map';
import type { BlockContent } from '../../scripts/load-recs';
import { makeUpRecipe } from '../muffler/walk-recipes';
import { actualSpeed, effectsOf } from './plan';
import { Colon } from '../muffler/colon';
import { cloneDeep } from 'lodash';
import { stackSize } from './chestify';

export function simulate(
  asms: BlockContent['asms'],
  include: (colon: Colon) => boolean = () => true,
) {
  const actions: Record<Colon, number>[] = [];
  for (const [factory, recipeName, modules] of asms) {
    if (!recipeName) continue;
    const recp = makeUpRecipe(recipeName);
    if (!recp) continue;
    const scale = actualSpeed(factory, modules) / recp.time;
    actions.push(effectsOf(recp, scale));
  }

  const outputs = new Set<Colon>();
  const inputs = new Set<Colon>();
  for (const action of actions) {
    for (const [colon, count] of Object.entries(action)) {
      if (count > 0) {
        outputs.add(colon);
      } else {
        inputs.add(colon);
      }
    }
  }

  const wanted = [...inputs].filter((input) => !outputs.has(input));
  const START_VALUE = 1e9;
  const WARMUP = 5 * 60;
  const TICKS = 3600;

  const current: Record<Colon, number> = Object.fromEntries(
    wanted.map((x) => [x, START_VALUE]),
  );
  const tick = () => {
    for (const action of actions) {
      if (
        Object.entries(action)
          .filter(([, count]) => count < 0)
          .some(([colon, count]) => current[colon] < -count)
      ) {
        continue;
      }
      for (const [colon, count] of Object.entries(action)) {
        current[colon] = (current[colon] ?? 0) + count;
      }
    }
  };
  for (let i = 0; i < WARMUP; ++i) {
    tick();
  }
  const initial = cloneDeep(current);
  for (let i = 0; i < TICKS; ++i) {
    tick();
  }

  return Object.entries(current)
    .map(
      ([colon, count]) =>
        [colon, (count - initial[colon] ?? 0) / TICKS] as const,
    )
    .filter(([, count]) => Math.abs(count) > 0.1)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .filter(([colon]) => include(colon))
    .map(([colon, count]) => {
      const fullTrain = stackSize(colon) * 50;
      return (
        <li>
          <span class={'amount'}>
            {humanise((count * 60 * 60) / fullTrain)}tph
          </span>
          <span class={'amount'}>{humanise(count)}</span>/s{' '}
          <ColonJoined colon={colon} />
        </li>
      );
    });
}

export class BlockPage extends Component<{ loc: string }> {
  render(props: { loc: string }) {
    const loc = props.loc;
    const obj = data.doc[loc];
    if (!obj) {
      return (
        <div>
          No block at {loc} (maybe it was merged, which isn't currently
          supported, sorry!)
        </div>
      );
    }
    const list = [];
    list.push(<BlockThumb loc={loc} />);
    if (Object.keys(obj.items).length !== 0) {
      list.push(
        <li>
          Storing:
          <ul>
            {Object.entries(obj.items)
              .sort(([, a], [, b]) => b - a)
              .map(([name, count]) => (
                <li>
                  {humanise(count)} * <Item name={name} />
                </li>
              ))}
          </ul>
        </li>,
      );
    }

    // recipe executions in this brick
    // const dats = [];
    // for (const [xy, dat] of Object.entries(data.cp.byPos)) {
    //   const [x, y] = xy.split(',').map((x) => parseInt(x, 10));
    //   const hit = toBlock([x, y]);
    //   if (String(hit) !== loc) continue;
    //   dats.push(dat);
    // }

    const { wanted, exports } = recipeDifference(obj);

    return (
      <>
        <div class="row">
          <h2>
            {loc} (<TagList tags={obj.tags} />)
          </h2>
        </div>
        <div class="row">
          <div class="col">
            <BlockThumb loc={loc} />
            <h3>Train stops</h3>
            <TrainStops stop={obj.stop} />
          </div>
          <div class="col">
            <h3>Simulation (approved)</h3>
            {simulate(
              obj.asms,
              (colon) => wanted.includes(colon) || exports.includes(colon),
            )}
            <h3>Simulation</h3>
            {simulate(obj.asms)}

            <h3 title="..but does not consume">Produces</h3>
            <ul>
              {exports.map((x) => (
                <li>
                  <ColonJoined colon={x} />
                </li>
              ))}
            </ul>
            <h3 title="..but does not produce">Consumes</h3>
            <ul>
              {wanted.map((x) => (
                <li>
                  <ColonJoined colon={x} />
                </li>
              ))}
            </ul>
            <h3>Storing</h3>
            <ul>
              {Object.entries(obj.colons)
                .sort(([, a], [, b]) => b - a)
                .map(([colon, count]) => (
                  <li>
                    <span class={'amount'}>{humanise(count)}</span> &times;{' '}
                    <ColonJoined colon={colon} />
                  </li>
                ))}
            </ul>
            <h3>Resources</h3>
            <ul>
              {Object.entries(obj.resources).map(([name, count]) => (
                <li>
                  {humanise(count)} * <Item name={name} />
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div class="row">
          <h3>Assemblers</h3>
          <Assemblers brick={obj} />
        </div>
      </>
    );
  }
}
