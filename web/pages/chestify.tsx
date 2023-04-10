import { Component } from 'preact';
import * as blueprint from '../muffler/blueprints';
import { ColonJoined } from '../objects';
import { Colon, fromColon, splitColon, tupleToColon } from '../muffler/colon';
import { data } from '../datae';
import { ItemIcon } from '../lists';

const banned = new Set([
  'item:logistic-train-stop-output',
  'item:logistic-train-stop-input',
]);

function fixupPlacements(
  items: Record<Colon, number>,
): [Record<Colon, number>, Record<Colon, number>] {
  const valid: Record<Colon, number> = {};
  const invalid: Record<Colon, number> = {};

  for (const [item, count] of Object.entries(items)) {
    if (banned.has(item)) continue;
    const [, name] = splitColon(item);
    const override = data.recipes.placeOverrides[name];
    if (override) {
      const colon = tupleToColon(['item', override]);
      valid[colon] = (valid[colon] || 0) + count;
      continue;
    }
    const [_, obj] = fromColon(item);
    if (obj) {
      valid[item] = count;
    } else {
      invalid[item] = count;
    }
  }

  return [valid, invalid];
}

interface ChestifyState {
  input?: string;
  banned: Record<Colon, boolean>;
}

export class Chestify extends Component<{}, ChestifyState> {
  state = {
    banned: {},
  };
  onInput = (e: any) => {
    this.setState({ input: e.target.value });
  };
  render(props: unknown, state: ChestifyState) {
    let output;
    let explain;
    if (state.input) {
      try {
        const bp = blueprint.decode(state.input);
        const items = blueprint.enumerate(bp);
        const [valid, invalid] = fixupPlacements(items);

        const byCount = (
          [ac, an]: [Colon, number],
          [bc, bn]: [Colon, number],
        ) => stacks(bc, bn) - stacks(ac, an) || bn - an;
        const wantedStacks = Object.entries(valid)
          .filter(([name]) => !state.banned[name])
          .map(([colon, count]) => stacks(colon, count))
          .reduce((a, b) => a + b, 0);
        const capacityStacks = 48;
        explain = (
          <>
            <div className={'col-6'}>
              {Object.keys(invalid).length ? <h2>ERRORS</h2> : ''}
              {Object.entries(invalid)
                .sort(byCount)
                .map(([name, count]) => (
                  <li>
                    {count} INVALID ITEM {name} excluded
                  </li>
                ))}
            </div>
            <div className={'col-6'}>
              <h2>
                Chest will request{' '}
                <span style={wantedStacks > capacityStacks ? 'color: red' : ''}>
                  {wantedStacks}/{capacityStacks}
                </span>{' '}
                stacks:
              </h2>
              <table class={'table chestify-summary'}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Stacks</th>
                    <th>Items</th>
                    <th>Item</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(valid)
                    .sort(byCount)
                    .map(([name, count]) => (
                      <tr class={state.banned[name] ? 'chestify-banned' : ''}>
                        <td>
                          <button
                            class={'btn btn-sm'}
                            onClick={() =>
                              this.setState(({ banned }) => ({
                                banned: { ...banned, [name]: !banned[name] },
                              }))
                            }
                          >
                            ❌
                          </button>
                        </td>
                        <td>{stacks(name, count)}</td>
                        <td>{count}</td>
                        <td>
                          <ColonJoined colon={name} />
                        </td>
                      </tr>
                    ))}
                  <tr>
                    <td>
                      <button
                        className={'btn btn-sm'}
                        onClick={() =>
                          this.setState(({ banned }) => ({
                            banned: {
                              ...banned,
                              'item:arithmetic-combinator': true,
                              'item:decider-combinator': true,
                              'item:constant-combinator': true,
                              'item:logistic-train-stop': true,
                              'item:rail-signal': true,
                              'item:rail-chain-signal': true,
                              'item:py-roboport-mk01': true,
                              'item:medium-electric-pole': true,
                              'item:long-handed-inserter': true,
                              'item:filter-inserter': true,
                              'item:py-storehouse-basic': true,
                              'item:fast-underground-belt': true,
                              'item:logistic-storage-chest': true,
                              'item:rail': true,
                              'item:big-electric-pole': true,
                            },
                          }))
                        }
                      >
                        ❌
                      </button>
                    </td>
                    <td colSpan={3} style={'text-align: left'}>
                      Exclude everything on a shuttle train
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        );

        const chesty = blueprint.toChest(
          bp,
          Object.fromEntries(
            Object.entries(valid)
              .filter(([name]) => !state.banned[name])
              .sort(byCount),
          ),
        );
        output = (
          <textarea
            class={'form-control big-boy'}
            readonly={true}
            value={blueprint.encode(chesty)}
          />
        );
      } catch (e) {
        console.error(e);
        explain = (
          <div className={'col-12'}>
            <div class={'alert alert-danger'}>ERROH {String(e)}</div>
          </div>
        );
      }
    } else {
      explain = (
        <div className={'col-12'}>
          <div class={'alert alert-info'}>
            Paste a blueprint string above and commit (i.e. lose focus)
          </div>
        </div>
      );
    }

    return (
      <>
        <div class={'row'}>
          <div class={'col-6'}>
            <h2>Paste any blueprint here...</h2>
            <textarea class={'form-control big-boy'} onChange={this.onInput} />
          </div>
          <div className={'col-6'}>
            <h2>
              Receive a{' '}
              <ItemIcon
                name={'logistic-chest-requester'}
                alt={'requester chest'}
              />{' '}
              blueprint here...
            </h2>
            {output}
          </div>
        </div>
        <div class={'row'}>{explain}</div>
      </>
    );
  }
}

function stacks(colon: Colon, items: number): number {
  const [, obj] = fromColon(colon);
  if ('stack_size' in obj) return Math.ceil(items / obj.stack_size);
  throw new Error(`unexpected object ${obj} for stack size`);
}
