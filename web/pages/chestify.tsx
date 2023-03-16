import { Component } from 'preact';
import * as blueprint from '../muffler/blueprints';
import { ColonJoined } from '../objects';
import { Colon, fromColon, splitColon, tupleToColon } from '../muffler/colon';
import { data } from '../datae';
import { ItemIcon } from '../lists';

const banned = new Set(['item:logistic-train-stop-output']);

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

export class Chestify extends Component<{}, { input?: string }> {
  onInput = (e: any) => {
    this.setState({ input: e.target.value });
  };
  render(props: unknown, state: { input?: string }) {
    let output;
    let explain;
    if (state.input) {
      try {
        const bp = blueprint.decode(state.input);
        const items = blueprint.enumerate(bp);
        const [valid, invalid] = fixupPlacements(items);

        const byCount = ([, a], [__, b]) => b - a;
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
              <h2>Chest will request</h2>
              {Object.entries(valid)
                .sort(byCount)
                .map(([name, count]) => (
                  <li>
                    <span class={'amount'}>{count}</span> &times;{' '}
                    <ColonJoined colon={name} />
                  </li>
                ))}
            </div>
          </>
        );

        const chesty = blueprint.toChest(
          bp,
          Object.fromEntries(Object.entries(valid).sort(byCount)),
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
