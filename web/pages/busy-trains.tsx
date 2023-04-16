import { Component } from 'preact';
import { data, Loc } from '../datae';
import { BlockLine, ColonJoined } from '../objects';
import { TICKS_PER_SECOND } from '../../scripts/magic';
import { humanise } from '../muffler/human';
import { stackSize } from './chestify';

const median = (arr: number[]) => {
  return p(arr, 0.5);
};

const p = (arr: number[], n: number) => {
  const sorted = arr.sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * n);
  return sorted[idx];
};

export class BusyTrains extends Component {
  render() {
    const byColon = Object.fromEntries(
      Object.entries(data.trainPulses.byColon).map(([colon, pulses]) => {
        const durations = pulses.map(([, , , d]) => d);
        const amounts = pulses.map(([, , , , a]) => a);

        return [
          colon,
          {
            len: pulses.length,
            duration: median(durations),
            amount: median(amounts),
            amountP95: p(amounts, 0.95),
          },
        ] as const;
      }),
    );

    const dat = () => ({ lenFrom: 0, lenTo: 0 });
    const byLoc: Record<Loc, { lenFrom: number; lenTo: number }> = {};
    for (const pulses of Object.values(data.trainPulses.byColon)) {
      for (const pulse of pulses) {
        const [from, to] = pulse;
        byLoc[from] = byLoc[from] ?? dat();
        byLoc[to] = byLoc[to] ?? dat();
        byLoc[from].lenFrom += 1;
        byLoc[to].lenTo += 1;
      }
    }

    const byBrick = (
      <table class={'table busy-trains-table'}>
        <thead>
          <tr>
            <th>Brick</th>
            <th>
              <abbr
                title={'number of trains observed moving during the profile'}
              >
                trains from
              </abbr>
            </th>
            <th>
              <abbr
                title={'number of trains observed moving during the profile'}
              >
                trains to
              </abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byLoc)
            .sort(([, a], [, b]) => b.lenFrom + b.lenTo - (a.lenFrom + a.lenTo))
            .map(([loc, { lenFrom, lenTo }]) => {
              return (
                <tr>
                  <td>
                    <BlockLine block={loc} />
                  </td>
                  <td>{humanise(lenFrom)}</td>
                  <td>{humanise(lenTo)}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    );

    const byItem = (
      <table class={'table busy-trains-table'}>
        <thead>
          <tr>
            <th>Item</th>
            <th>
              <abbr
                title={'number of trains observed moving during the profile'}
              >
                trains
              </abbr>
            </th>
            <th>
              <abbr
                title={`median duration (minutes wallclock at ${TICKS_PER_SECOND}tps) of a journey`}
              >
                η mins
              </abbr>
            </th>
            <th>
              <abbr title={'median train fill (at 50-stack target)'}>
                η util
              </abbr>
            </th>
            <th>
              <abbr title={'95th percentile train fill (at 50-stack target)'}>
                p95 util
              </abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byColon)
            .sort(([, a], [, b]) => b.len - a.len)
            .map(([colon, { len, duration, amount, amountP95 }]) => {
              const stacks = stackSize(colon);
              const descStacks = (amount / stacks).toFixed(1);
              const fillDesc = `${amount.toFixed()} items @ ${stacks} items/stack = ${descStacks}/50 stacks`;
              const stackScore = amount / stacks / 50;
              const stackScoreP95 = amountP95 / stacks / 50;
              const fillClass =
                stackScore < 0.1
                  ? 'busy-trains-table--naughty'
                  : stackScore < 0.4
                  ? 'busy-trains-table--risky'
                  : `${stackScore}`;
              return (
                <tr>
                  <td>
                    <ColonJoined colon={colon} />
                  </td>
                  <td>{humanise(len)}</td>
                  <td>{(duration / TICKS_PER_SECOND / 60).toFixed(1)}</td>
                  <td class={fillClass}>
                    <abbr title={fillDesc}>
                      {(100 * stackScore).toFixed()}%
                    </abbr>
                  </td>
                  <td>{(100 * stackScoreP95).toFixed()}%</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    );
    return (
      <div class={'row'}>
        <div class={'col'}>{byItem}</div>
        <div class={'col'}>{byBrick}</div>
      </div>
    );
  }
}
