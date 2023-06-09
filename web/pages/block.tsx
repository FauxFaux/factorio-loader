import { Component } from 'preact';
import type { JSX } from 'preact';
import { isEqual } from 'lodash';

import { ColonJoined, Item, TagList } from '../objects';
import { Assemblers, recipeDifference, TrainStops } from '../block-renderers';
import { data } from '../datae';
import { humanise } from '../muffler/human';
import { BlockThumb } from './map';
import type { BlockContent } from '../../scripts/load-recs';
import { makeUpRecipe } from '../muffler/walk-recipes';
import { actualSpeed, effectsOf } from './plan';
import { Colon, fromColon, splitColon, tupleToColon } from '../muffler/colon';
import { ltnSummary } from '../ltn-summary';
import { sortByKeys } from '../muffler/deter';
import { ItemIcon } from '../lists';
import { colonMapCombinator } from '../muffler/stations';
import { stackSize } from './chestify';

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

function hillClimbMutates(
  f: (eff: number[]) => number,
  efficiencies: number[],
) {
  let score = f(efficiencies);

  for (let i = 0; i < 100; ++i) {
    const tweak = Math.floor(Math.random() * efficiencies.length);
    while (true) {
      const up = Math.min(efficiencies[tweak] + Math.random() * 0.05, 1);
      const down = Math.max(efficiencies[tweak] - Math.random() * 0.05, 0);
      const upScore = f([
        ...efficiencies.slice(0, tweak),
        up,
        ...efficiencies.slice(tweak + 1),
      ]);
      const downScore = f([
        ...efficiencies.slice(0, tweak),
        down,
        ...efficiencies.slice(tweak + 1),
      ]);
      if (upScore > score) {
        efficiencies[tweak] = up;
        score = upScore;
      } else if (downScore > score) {
        efficiencies[tweak] = down;
        score = downScore;
      } else {
        break;
      }
    }
  }
  return score;
}

export function findEfficiencies(
  realActions: Record<Colon, number>[],
  modes: Modes,
) {
  const actions = mergeDuplicateActions(realActions);

  const contributions = toContributions(actions);

  const terms: string[] = [];
  for (const [colon, contrib] of Object.entries(contributions)) {
    const mod = colon.startsWith('fluid:') ? 1 / 100 : 1;
    const amt = Object.entries(contrib)
      .map(([eff, count]) => `(e[${eff}]*${count}*${mod})`)
      .join('+');
    if (modes.inputs.has(colon)) {
      terms.push(`-${amt}`);
    } else if (modes.outputs.has(colon)) {
      terms.push(amt);
    } else {
      terms.push(`-100*Math.abs(${amt})`);
    }
  }
  const f: (eff: number[]) => number = eval(`(e) => ${terms.join('+')}+0`);

  let bestScore = -Infinity;
  let bestEfficiency: number[] = [];

  for (let t = 0; t < 1_000; ++t) {
    const efficiencies: number[] = [];
    for (let i = 0; i < actions.length; ++i) {
      efficiencies.push(1 - Math.random() * Math.random());
    }

    const score = hillClimbMutates(f, efficiencies);

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

interface BlockState {
  calcModes: Record<Colon, 'import' | 'export' | 'internal' | 'shrug'>;
}

export class BlockPage extends Component<{ loc: string }, BlockState> {
  state = {
    calcModes: {},
  };
  render(props: { loc: string }, state: BlockState) {
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

    const actions = toActions(obj.asms);
    for (let i = 0; i < obj.boilers; ++i) {
      actions.push({ 'item:biomass': -(1 / 1.8), 'fluid:steam': 60 });
    }

    let guessy, efficiencies: ReturnType<typeof findEfficiencies>;
    {
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

      efficiencies = findEfficiencies(actions, modes);
      guessy = (
        <>
          <ul>
            {efficiencies.actions.map((action, i) => (
              <li>
                <span class={'amount'}>
                  {Math.round(efficiencies.bestEfficiency[i] * 100)}%
                </span>{' '}
                {Object.entries(action)
                  .sort(([, a], [, b]) => a - b)
                  .map(([colon, count]) => {
                    const [, item] = fromColon(colon);
                    const [, name] = splitColon(colon);
                    return (
                      <>
                        <span class={'amount'}>{humanise(count)}</span>{' '}
                        <ItemIcon name={name} alt={item.localised_name} />
                      </>
                    );
                  })}
              </li>
            ))}
          </ul>
        </>
      );
    }

    const { wanted, intermediates, exports } = recipeDifference(obj);

    const requested: Record<string, number> = {};
    for (const stop of obj.stop) {
      for (const [colon, count] of Object.entries(colonMapCombinator(stop))) {
        if (colon.startsWith('virtual:')) continue;
        requested[colon] = (requested[colon] || 0) + count;
      }
    }

    const provides: Record<string, string[]> = {};
    for (const stop of obj.stop) {
      for (const provision of stop.provides) {
        const item = tupleToColon(provision);
        provides[item] = provides[item] || [];
        provides[item].push(stop.name);
      }
    }

    const wantedMissing = wanted.filter((x) => !requested[x]);
    const exportsUnused = exports.filter((x) => !provides[x]);
    const intermediatesNotMentioned = intermediates.filter(
      (x) => !requested[x] && !provides[x],
    );

    const newCalcModes = { ...state.calcModes };

    for (const colon of Object.keys(requested)) {
      if (newCalcModes[colon]) {
        continue;
      }
      if (colon in provides) {
        newCalcModes[colon] = 'shrug';
        continue;
      }
      newCalcModes[colon] = 'import';
    }

    for (const colon of Object.keys(provides)) {
      if (!newCalcModes[colon]) {
        newCalcModes[colon] = 'export';
      }
    }

    for (const colon of intermediatesNotMentioned) {
      if (!newCalcModes[colon]) {
        newCalcModes[colon] = 'internal';
      }
    }

    for (const colon of wantedMissing) {
      if (!newCalcModes[colon]) {
        newCalcModes[colon] = 'shrug';
      }
    }

    for (const colon of exportsUnused) {
      if (!newCalcModes[colon]) {
        newCalcModes[colon] = 'shrug';
      }
    }

    if (!isEqual(newCalcModes, state.calcModes)) {
      this.setState({ calcModes: newCalcModes });
    }

    const icons = {
      import: '➡',
      export: '⬅',
      internal: '🩻',
      shrug: '🤷',
    };

    const opts = (colon: string) => {
      return (['import', 'internal', 'export', 'shrug'] as const).map(
        (mode) => (
          <td>
            <input
              class={'form-check-input'}
              type={'radio'}
              name={colon}
              value={mode}
              checked={state.calcModes[colon] === mode}
              onChange={() =>
                this.setState({
                  calcModes: { ...state.calcModes, [colon]: mode },
                })
              }
            />
          </td>
        ),
      );
    };

    const recpUsage = (colon: Colon) => {
      if (wanted.includes(colon)) {
        return 'import';
      }
      if (intermediates.includes(colon)) {
        return 'internal';
      }
      if (exports.includes(colon)) {
        return 'export';
      }
      return 'shrug';
    };

    const rows: JSX.Element[] = [];
    for (const [pos, arr, f] of [
      [
        'import',
        [...Object.keys(requested), ...wantedMissing],
        (colon: Colon) => {
          if (!(colon in requested)) {
            return (
              <td colSpan={2} style={'text-align: center'}>
                heresy import?
              </td>
            );
          }
          const count = requested[colon] || 0;
          const stacks = -count / stackSize(colon);
          return (
            <>
              <td style={'text-align: right'}>{humanise(-count)}</td>
              <td
                style={
                  'text-align: right; ' + (stacks < 50 ? 'color: red' : '')
                }
              >
                {humanise(stacks, { altSuffix: ' stacks' })}
              </td>
            </>
          );
        },
      ],
      [
        'export',
        [
          ...Object.keys(provides).filter((x) => !(x in requested)),
          ...exportsUnused,
        ],
        (colon: Colon) => (
          <td colSpan={2} style={'text-align: center'}>
            {provides[colon]?.map((name) => (
              <abbr title={`being provided by ${name}`}>🚉</abbr>
            )) ?? (
              <abbr title={'heresy export, or mislabelled station?'}>😈</abbr>
            )}
          </td>
        ),
      ],
      ['internal', intermediatesNotMentioned, () => <td colSpan={2} />],
    ] as const) {
      for (const colon of arr) {
        const recpType = recpUsage(colon);
        rows.push(
          <tr>
            <td title={pos}>{icons[pos]}</td>
            <td title={recpType}>{icons[recpType]}</td>
            {f(colon)}
            <td>
              <ColonJoined colon={colon} />
            </td>
            {opts(colon)}
          </tr>,
        );
      }
    }

    const understanding = (
      <table class={'table'} style={'width: auto'}>
        <thead>
          <tr>
            <th colSpan={4}>Guess</th>
            <th>Item</th>
            <th title={'import'}>➡</th>
            <th title={'internal'}>🩻</th>
            <th title={'export'}>⬅</th>
            <th title={'ignore'}>🤷‍♀️</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );

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
            <h3 title="..but does not consume">Produces</h3>
            <ul>
              {exports.map((x) => (
                <li>
                  <span class={'amount'}>
                    {humanise(efficiencies.result[x], { altSuffix: '/s' })}
                  </span>
                  /s <ColonJoined colon={x} />
                </li>
              ))}
            </ul>
            <h3 title="..but does not produce">Consumes</h3>
            <ul>
              {wanted.map((x) => (
                <li>
                  <span class={'amount'}>
                    {humanise(efficiencies.result[x], { altSuffix: '/s' })}
                  </span>
                  /s <ColonJoined colon={x} />
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
          <div class={'col'}>
            <h3>Understanding</h3>
            {understanding}
          </div>
        </div>
        <div class={'row'}>
          <div class={'col'}>
            <h3>Internal efficiencies</h3>
            {guessy}
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
