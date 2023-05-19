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
import { ltnSummary } from '../ltn-summary';
import { sortByKeys } from '../muffler/deter';

interface Modes {
  // an unbounded amount of this is available from the rail network
  inputs: Set<Colon>;

  // an unbounded amount of this can be sunk by the rail network
  outputs: Set<Colon>;
}

function toActions(asms: BlockContent['asms']): Record<string, number>[] {
  const actions: Record<Colon, number>[] = [];
  for (const [factory, recipeName, modules] of asms) {
    if (!recipeName) continue;
    const recp = makeUpRecipe(recipeName);
    if (!recp) continue;
    const scale = actualSpeed(factory, modules) / recp.time;
    actions.push(effectsOf(recp, scale));
  }
  return actions;
}

function toContributions(actions: Record<Colon, number>[]) {
  const result: Record<string, Record<number, number>> = {};
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    for (const [colon, count] of Object.entries(action)) {
      if (!result[colon]) result[colon] = {};
      result[colon][i] = (result[colon][i] || 0) + count;
    }
  }
  return result;
}

function applyEfficiencies(
  actions: Record<Colon, number>[],
  efficiencies: number[],
) {
  const result: Record<string, number> = {};
  for (let act = 0; act < actions.length; act++) {
    const action = actions[act];
    for (const [colon, count] of Object.entries(action)) {
      result[colon] = (result[colon] || 0) + count * efficiencies[act];
    }
  }
  return result;
}

function scoreResult(result: Record<string, number>, modes: Modes) {
  let score = 0;
  for (const [colon, count] of Object.entries(result)) {
    if (modes.inputs.has(colon)) {
      // consuming inputs good
      if (count < 0) {
        score += Math.abs(count);
      }
    } else {
      // consuming non-inputs very bad
      if (count < 0) {
        score -= 10 * Math.abs(count);
      }
    }

    if (modes.outputs.has(colon)) {
      // generating outputs good (generating negative outputs bad)
      score += count;
    } else {
      // generating intermediates bad
      if (count > 0) {
        score -= 2 * count;
      }
    }
  }
  return score;
}

function mergeDuplicateActions(realActions: Record<Colon, number>[]) {
  const actionCount: Record<string, number> = {};
  for (const action of realActions) {
    // oh yes I did
    const k = JSON.stringify(sortByKeys(action));
    actionCount[k] = (actionCount[k] || 0) + 1;
  }

  const actions: Record<Colon, number>[] = [];
  for (const [k, count] of Object.entries(actionCount)) {
    const action: Record<Colon, number> = JSON.parse(k);
    for (const k of Object.keys(action)) {
      action[k] *= count;
    }
    actions.push(action);
  }
  return actions;
}

export function guess(realActions: Record<Colon, number>[], modes: Modes) {
  const actions = mergeDuplicateActions(realActions);

  const contributions = toContributions(actions);

  const terms: string[] = [];
  for (const [colon, contrib] of Object.entries(contributions)) {
    const amt = Object.entries(contrib)
      .map(([eff, count]) => `(e[${eff}]*${count})`)
      .join('+');
    if (modes.inputs.has(colon)) {
      terms.push(`-${amt}`);
    } else if (modes.outputs.has(colon)) {
      terms.push(amt);
    } else {
      terms.push(`-Math.abs(${amt})`);
    }
  }
  const f: (eff: number[]) => number = eval(`(e) => ${terms.join('+')}`);

  let bestScore = -Infinity;
  let bestEfficiency: number[] = [];

  for (let t = 0; t < 100_000_000; ++t) {
    const efficiencies: number[] = [];
    for (let i = 0; i < actions.length; ++i) {
      efficiencies.push(1 - Math.random() * Math.random());
    }

    const score = f(efficiencies);

    if (score > bestScore) {
      bestScore = score;
      bestEfficiency = efficiencies;
    }
  }

  return {
    actions,
    bestScore,
    bestEfficiency,
    result: applyEfficiencies(actions, bestEfficiency),
  };
}

export function simulate(realActions: Record<Colon, number>[], modes: Modes) {
  const WARMUP = 5 * 60;
  const TICKS = 3600;
  const OVERLOAD = 2;

  // items involved in a cycle?
  const required = new Set<Colon>([
    'item:moss',
    'item:biomass',
    'fluid:carbon-dioxide',
  ]);

  const recipePriority = (action: Record<Colon, number>) => {
    if (
      Object.entries(action).some(
        ([colon, count]) => count > 0 && required.has(colon),
      )
    ) {
      return 2;
    }

    // this still deadlocks on auog butchery, __underflow hack below is closer but also deadlocks with the current stack sizes
    const outputs = Object.entries(action)
      .filter(([, count]) => count > 0)
      .map(([colon]) => colon);
    if (outputs.length === 1 && outputs[0] === 'item:cage') {
      return -1;
    }

    return 0;
  };

  const actions = realActions
    .map((action) => cloneDeep(action))
    .sort((a, b) => recipePriority(b) - recipePriority(a));

  for (const action of actions) {
    const inputs = Object.entries(action)
      .filter(([, count]) => count < 0)
      .map(([colon]) => colon);

    // sinkhole
    if (inputs.length === 1 && inputs[0] === 'fluid:water') {
      action['__overflow'] = 1;
    }

    const outputs = Object.entries(action)
      .filter(([, count]) => count > 0)
      .map(([colon]) => colon);
    if (outputs.length === 1 && outputs[0] === 'item:cage') {
      action['__underflow'] = 1;
    }
  }

  const bufferSize: Record<Colon, number> = {};
  for (const action of actions) {
    for (const [colon, count] of Object.entries(action)) {
      bufferSize[colon] = (bufferSize[colon] ?? 0) + OVERLOAD * Math.abs(count);
    }
  }

  const current: Record<Colon, number> = Object.fromEntries(
    Object.entries(bufferSize).map(([colon, value]) => [colon, value / 2]),
  );
  const overruns: Record<Colon, number> = {};
  const underruns: Record<Colon, number> = {};

  const tick = () => {
    for (const action of actions) {
      // if some input is missing, don't execute
      const underran = Object.entries(action)
        .filter(([colon]) => !colon.startsWith('_'))
        .filter(([colon]) => !modes.inputs.has(colon))
        .filter(
          ([colon, count]) =>
            count < (action['__overflow'] ? 0.5 : 0) * bufferSize[colon],
        )
        .find(([colon, count]) => current[colon] < -count);
      if (underran) {
        const [colon, count] = underran;
        underruns[colon] = (underruns[colon] ?? 0) - count;
        continue;
      }

      const overran = Object.entries(action)
        .filter(([colon]) => !colon.startsWith('_'))
        .filter(([colon]) => !modes.outputs.has(colon))
        .filter(([, count]) => count > 0)
        .find(
          ([colon, count]) =>
            current[colon] + count >
            (action['__underflow'] ? 0.1 : 1) * bufferSize[colon],
        );
      if (overran) {
        const [colon, count] = overran;
        overruns[colon] = (overruns[colon] ?? 0) + count;
        continue;
      }
      for (const [colon, count] of Object.entries(action).filter(
        ([colon]) => !colon.startsWith('_'),
      )) {
        current[colon] = (current[colon] ?? 0) + count;
      }
    }
  };
  for (let i = 0; i < WARMUP; ++i) {
    tick();
  }
  const initial = cloneDeep({
    current,
    overruns,
    underruns,
  });
  for (let i = 0; i < TICKS; ++i) {
    tick();
  }

  const scaleDown = (
    obj: Record<Colon, number>,
    initial: Record<Colon, number>,
  ) =>
    Object.entries(obj).map(
      ([colon, count]) =>
        [colon, (count - initial[colon] ?? 0) / TICKS] as const,
    );

  // you'd think TS could do this, wouldn't you, but no
  return {
    current: scaleDown(current, initial.current),
    overruns: scaleDown(overruns, initial.overruns),
    underruns: scaleDown(underruns, initial.underruns),
  };
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

    let simulation, result, guessy, contr;
    {
      const actions = toActions(obj.asms);
      for (let i = 0; i < obj.boilers; ++i) {
        actions.push({ 'item:biomass': -(1 / 1.8), 'fluid:steam': 60 });
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
      const produced = [...outputs].filter((output) => !inputs.has(output));

      const ltn = ltnSummary(obj);

      const modes: Modes = {
        inputs: new Set(wanted),
        outputs: new Set(produced),
      };

      for (const req of Object.keys(ltn.requests)) {
        modes.inputs.add(req);
      }

      for (const prov of Object.keys(ltn.provides)) {
        modes.outputs.add(prov);
      }

      result = simulate(actions, modes);
      guessy = <pre>{JSON.stringify(guess(actions, modes), null, 2)}</pre>;
      contr = (
        <pre>
          {JSON.stringify(
            toContributions(mergeDuplicateActions(actions)),
            null,
            2,
          )}
        </pre>
      );

      simulation = result.current
        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
        .filter(
          ([colon]) => modes.inputs.has(colon) || modes.outputs.has(colon),
        )
        .map(([colon, count]) => {
          const fullTrain = stackSize(colon) * 50;
          return (
            <li>
              <span class={'amount'}>
                {humanise((Math.abs(count) * 60 * 60) / fullTrain)}
              </span>
              <span class={'amount'}>{humanise(count)}</span>/s{' '}
              <ColonJoined colon={colon} />
            </li>
          );
        });
    }

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
            <h3>Contr</h3>
            {contr}
            <h3>Guess</h3>
            {guessy}
            <h3>Simulation</h3>
            {simulation}
            <h3>Overruns</h3>
            <ul>
              {result.overruns
                .sort(([, a], [, b]) => b - a)
                .map(([colon, count]) => (
                  <li>
                    <span class={'amount'}>{humanise(count)}</span> &times;{' '}
                    <ColonJoined colon={colon} />
                  </li>
                ))}
            </ul>
            <h3>Underruns</h3>
            <ul>
              {result.underruns
                .sort(([, a], [, b]) => b - a)
                .map(([colon, count]) => (
                  <li>
                    <span class={'amount'}>{humanise(count)}</span> &times;{' '}
                    <ColonJoined colon={colon} />
                  </li>
                ))}
            </ul>

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
