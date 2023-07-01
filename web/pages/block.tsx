import type { JSX } from 'preact';
import { Component } from 'preact';
import { cloneDeep, isEqual } from 'lodash';

import { ColonJoined, Item, TagList } from '../objects';
import { Assemblers, recipeDifference, TrainStops } from '../block-renderers';
import { data } from '../datae';
import { humanise } from '../muffler/human';
import { BlockThumb } from './map';
import type { BlockContent } from '../../scripts/load-recs';
import { makeUpRecipe } from '../muffler/walk-recipes';
import { actualSpeed, effectsOf } from './plan';
import { Colon, fromColon, splitColon, tupleToColon } from '../muffler/colon';
import { sortByKeys } from '../muffler/deter';
import { ItemIcon } from '../lists';
import { colonMapCombinator } from '../muffler/stations';
import { stackSize } from './chestify';

export function toActions(
  asms: BlockContent['asms'],
): Record<string, number>[] {
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

export function inlineActions(
  actions: Record<Colon, number>[],
  imports: Colon[],
) {
  let now = actions;
  const inlines = [];
  for (let i = 0; i < 100; ++i) {
    now = mergeDuplicateActions(now);
    const ret = inlineStep(now, imports);
    if (!ret) break;
    now = ret.actions;
    inlines.push(ret.inlined);
  }

  return { actions: now, inlines };
}

function inlineStep(realActions: Record<Colon, number>[], imports: Colon[]) {
  let actions = cloneDeep(realActions);
  const singularProducersOf: Record<Colon, number[]> = {};
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const produces = Object.keys(action).filter((k) => action[k] > 0);
    if (produces.length !== 1) {
      continue;
    }
    const product = produces[0];
    if (imports.includes(product)) continue;
    if (!singularProducersOf[product]) {
      singularProducersOf[product] = [];
    }
    singularProducersOf[product].push(i);
  }

  const candidates = Object.entries(singularProducersOf)
    .filter(([k, v]) => v.length === 1)
    .map(([k, v]) => [k, v[0]] as const);
  // if (candidates.length === 0) break;

  for (const [colon, producer] of candidates) {
    const consumers: number[] = [];
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      for (const k of Object.keys(action)) {
        if (k === colon && action[k] < 0) {
          consumers.push(i);
        }
      }
    }
    if (consumers.length !== 1) {
      const available = actions[producer][colon];
      const required = -consumers.reduce((a, b) => a + actions[b][colon], 0);
      if (available >= required) {
        console.log(
          'needlessly skipping',
          colon,
          'from',
          actions[producer],
          'at',
          available,
          'because',
          consumers.map((i) => actions[i]),
          'only needs',
          required,
        );
      }
      continue;
    }
    const consumer = consumers[0];
    const consumerAction = actions[consumer];
    const producerAction = actions[producer];

    const consumerQuantity = consumerAction[colon];
    const productionQuantity = producerAction[colon];

    const efficiency = productionQuantity / -consumerQuantity;
    const consumerEfficiency = Math.min(1, efficiency);
    const producerEfficiency = Math.min(1, 1 / efficiency);

    console.log(
      'inlining',
      colon,
      'from',
      producerAction,
      'into',
      consumerAction,
      'at',
      efficiency,
    );
    actions.splice(producer, 1);
    const originalConsumerAction = { ...consumerAction };
    const originalProducerAction = { ...producerAction };

    delete consumerAction[colon];
    delete producerAction[colon];
    for (const k of Object.keys(consumerAction)) {
      consumerAction[k] *= consumerEfficiency;
    }

    for (const k of Object.keys(producerAction)) {
      consumerAction[k] =
        (consumerAction[k] ?? 0) + producerAction[k] * producerEfficiency;
    }

    console.log('result', consumerAction);

    return {
      actions,
      inlined: {
        colon,
        producer: originalProducerAction,
        consumer: originalConsumerAction,
        efficiency,
        result: { ...consumerAction },
      },
    };
  }

  return undefined;
}

function mergeDuplicateActions(realActions: Record<Colon, number>[]) {
  const actionCount: Record<string, number> = {};
  for (const action of realActions) {
    if (Object.keys(action).length === 0) continue;
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

// the above converts {a:1,b:2},{a:1,b:2},{a:1,b:18823812} to {a:2,b:4},{a:1,b:18823812} (i.e. maintains assembler info)
// this converts {a:1,b:2},{a:1,b:2},{a:1,b:18823812} to {a:3,b:18823816}, so just the raw action
export function mergeDuplicateActions2(realActions: Record<Colon, number>[]) {
  type Keys = string;
  const merged: Record<Keys, Record<Colon, number>> = {};
  for (const action of realActions) {
    if (Object.keys(action).length === 0) continue;
    const keys: Keys = Object.keys(action).sort().join(',');
    merged[keys] = merged[keys] || {};
    for (const [k, v] of Object.entries(action)) {
      merged[keys][k] = (merged[keys][k] || 0) + v;
    }
  }

  return Object.values(merged);
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
  modes: BlockState['calcModes'],
) {
  const shrugs = Object.entries(modes)
    .filter(([k, v]) => v === 'shrug')
    .map(([k]) => k);
  const withoutShrugs = realActions.map((action) => {
    const result: Record<Colon, number> = { ...action };
    for (const shrug of shrugs) {
      delete result[shrug];
    }
    return result;
  });
  const { actions: actions, inlines } = inlineActions(
    withoutShrugs,
    Object.entries(modes)
      .filter(([k, v]) => v === 'import')
      .map(([k]) => k),
  );

  const contributions = toContributions(actions);

  const terms: string[] = [];
  for (const [colon, contrib] of Object.entries(contributions)) {
    const mod = colon.startsWith('fluid:') ? 1 / 100 : 1;
    const amt = Object.entries(contrib)
      .map(([eff, count]) => `(e[${eff}]*${count}*${mod})`)
      .join('+');
    if (modes[colon] === 'import') {
      terms.push(`-${amt}`);
    } else if (modes[colon] === 'export') {
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
    inlines,
  };
}

type ModeConfig = Record<Colon, 'import' | 'export' | 'internal' | 'shrug'>;

interface BlockState {
  calcModes: ModeConfig;
}

function ltnSummaryHarsh(obj: BlockContent) {
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
  return { requested, provides };
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

    const efficiencies = findEfficiencies(actions, state.calcModes);
    const effTable = (
      <ul>
        {efficiencies.actions.map((action, i) => (
          <li>
            <span class={'amount'}>
              {Math.round(efficiencies.bestEfficiency[i] * 100)}%
            </span>{' '}
            <Action action={action} />
          </li>
        ))}
        <hr />
        {efficiencies.inlines.map(
          ({ colon, producer, consumer, result, efficiency }) => (
            <li>
              {' '}
              <span class={'amount'}>{Math.round(efficiency * 100)}%</span>{' '}
              <Action action={producer} /> into <Action action={consumer} />{' '}
              giving <Action action={result} />
            </li>
          ),
        )}
      </ul>
    );

    const { requested, provides } = ltnSummaryHarsh(obj);
    const { wanted, intermediates, exports } = recipeDifference(obj);

    const wantedMissing = wanted.filter((x) => !requested[x]);
    const exportsUnused = exports.filter((x) => !provides[x]);
    const intermediatesNotMentioned = intermediates.filter(
      (x) => !requested[x] && !provides[x],
    );

    const newCalcModes = { ...state.calcModes };

    const setIfNotSet = (colon: Colon, mode: (typeof newCalcModes)[string]) => {
      if (newCalcModes[colon]) return;
      newCalcModes[colon] = mode;
    };

    for (const colon of ['item:empty-barrel', 'fluid:water']) {
      setIfNotSet(colon, 'shrug');
    }

    for (const colon of Object.keys(requested)) {
      setIfNotSet(colon, colon in provides ? 'shrug' : 'import');
    }

    for (const colon of Object.keys(provides)) {
      setIfNotSet(colon, 'export');
    }

    for (const colon of intermediatesNotMentioned) {
      setIfNotSet(colon, 'internal');
    }

    for (const colon of wantedMissing) {
      setIfNotSet(colon, 'shrug');
    }

    for (const colon of exportsUnused) {
      setIfNotSet(colon, 'shrug');
    }

    if (!isEqual(newCalcModes, state.calcModes)) {
      this.setState({ calcModes: newCalcModes });
    }

    const icons = {
      import: '➡',
      export: '⬅',
      internal: '🩻',
      shrug: '🤷',
    } as const;

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
        const relevantActions = efficiencies.actions.filter((action) => {
          return action[colon] !== undefined;
        });
        rows.push(
          <tr>
            <td title={pos}>{icons[pos]}</td>
            <td title={recpType}>{icons[recpType]}</td>
            {f(colon)}
            <td>
              <ColonJoined colon={colon} />
            </td>
            {opts(colon)}
            <td>
              <span class={'amount'}>
                {humanise(efficiencies.result[colon], { altSuffix: '/s' })}/s
              </span>
            </td>
            <td>
              {relevantActions.map((action, i) => (
                <span style={'margin-left: 0.6em'}>
                  {Math.round(efficiencies.bestEfficiency[i] * 100)}%{' '}
                  <Action action={action} />
                </span>
              ))}
            </td>
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
            <th title={'production (net)'}>net</th>
            <th>relevant actions</th>
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
            <p>
              The search algorithm here is trying to maximise the quantity of
              every output (⬅), while none of the internals (intermediates?) (🩻)
              go into runaway.
            </p>
            <p>
              Turning 5 <ColonJoined colon={'item:wood'} /> into 2{' '}
              <ColonJoined colon={'item:diamond'} /> and 130{' '}
              <ColonJoined colon={'item:sand'} /> every second is no good if you
              can only dispose of 50 of those{' '}
              <ColonJoined colon={'item:sand'} />, so this tries to report that
              only (50/130)*2 = 0.76
              <ColonJoined colon={'item:diamond'} /> is being produced.
            </p>
            <p>
              If the <ColonJoined colon={'item:sand'} /> is being disposed of
              some other way (e.g. heresy belted away, or put in a{' '}
              <ColonJoined colon={'item:py-burner'} /> (which aren't
              supported)), then you can ignore (🤷‍♀️) it for the calculation, and
              get a different result.
            </p>
            <p>
              The guesses for 'provides' are based entirely on the station name,
              which must contain (for everything provided) the icon, the icon of
              the fluid, or no icons and the exact English item name. Changes
              here are not persisted, you must rename the station in-game.
            </p>
            {understanding}
          </div>
        </div>
        <div class={'row'}>
          <div class={'col'}>
            <h3>Internal efficiencies</h3>
            {effTable}
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

export const Action = (props: { action: Record<Colon, number> }) => {
  const consumes = Object.entries(props.action).filter(([, v]) => v < 0);
  const produces = Object.entries(props.action).filter(([, v]) => v > 0);
  // TODO: this is colon sorted, not localised_name sorted
  consumes.sort(([a], [b]) => a.localeCompare(b));
  produces.sort(([a], [b]) => a.localeCompare(b));

  // so dumb
  const icon = (colon: Colon) => {
    const [, item] = fromColon(colon);
    const [, name] = splitColon(colon);
    return <ItemIcon name={name} alt={item.localised_name} />;
  };

  const countItem = (colon: Colon, count: number) => {
    if (colon.startsWith('hack:')) return <i>hack</i>;
    return (
      <>
        {humanise(count)} {icon(colon)}
      </>
    );
  };

  const consumesItems = consumes.map(([colon, count]) =>
    countItem(colon, Math.abs(count)),
  );
  const producesItems = produces.map(([colon, count]) =>
    countItem(colon, count),
  );

  return (
    <span
      class={'action-pill badge rounded-pill'}
      style={'vertical-align: middle; margin: 1px'}
    >
      {intersperse(consumesItems, <> + </>)} 🠚{' '}
      {intersperse(producesItems, <> + </>)}
    </span>
  );
};

function intersperse<T>(arr: T[], sep: T): T[] {
  return arr.reduce((a: T[], v: T) => [...a, v, sep], []).slice(0, -1);
}
