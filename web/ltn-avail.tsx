import { Component } from 'preact';

import { StopLine } from './pages/station-status';
import {
  colonMapCombinator,
  colonMapItems,
  ltnMinTransfer,
  settingsMap,
  Stat,
  stations,
} from './muffler/stations';
import { Measurement } from './ltn-summary';
import { humanise, humaniseNo } from './muffler/human';

interface LtnAvailabilityProps {
  stop: Stat;

  /** how much is available right now */
  avail: number;

  /** how much LTN is waiting for */
  min: number;

  flows: { flow: number; totalFlow: number };

  /** colour at 1/10th */
  decimate?: boolean;
}
export class LtnAvailability extends Component<LtnAvailabilityProps> {
  render(props: LtnAvailabilityProps) {
    return (
      <tr>
        <td>{humanise(props.avail)}</td>
        <td>
          <LtnFlow flows={props.flows} />
        </td>
        <td>
          <LtnPercent
            actual={props.avail}
            expected={props.min}
            decimate={props.decimate}
          />{' '}
        </td>
        <td>
          <StopLine stop={props.stop} />
        </td>
      </tr>
    );
  }
}

export const LtnPercent = (props: Measurement & { decimate?: boolean }) => {
  const health = (props.actual / props.expected) * 100;
  const dec = props.decimate ? 10 : 1;
  return (
    <abbr
      className={`ltn-health-${
        health < 100 / dec ? 'red' : health > 300 / dec ? 'green' : 'yellow'
      }`}
      title={`${humaniseNo(props.actual)} available / ${humaniseNo(
        props.expected,
      )} expected`}
    >
      {health.toLocaleString('en', { maximumFractionDigits: 0 })}%
    </abbr>
  );
};

export type LtnFilter = { colon: string };

export class LtnProvides extends Component<LtnFilter> {
  render(props: LtnFilter) {
    const providers = stations()
      .flatMap(([loc, stop]) => {
        const actualItemsAvailable = colonMapItems(stop)[props.colon];
        if (!(actualItemsAvailable > 0)) {
          return [];
        }

        const settings = settingsMap(stop);
        const min = ltnMinTransfer(props.colon, settings);
        const flow = stop.flowFrom[props.colon] ?? 0;
        return [[[loc, stop], actualItemsAvailable, min, flow] as const];
      })
      .sort(
        ([, avalue, amin], [, bvalue, bmin]) => bvalue / bmin - avalue / amin,
      );

    const totalFlow = providers.reduce((acc, [, , , flow]) => acc + flow, 0);

    return (
      <table className="ltn-avail">
        <tr>
          <th>
            <abbr title="actual count available here right now, in the most recent snapshot">
              act
            </abbr>
          </th>
          <th>
            <abbr title="what percentage of cargo was sourced/sunk from this stop, in the most recent *simulation*">
              flow
            </abbr>
          </th>
          <th>
            <abbr title="how much of a train we can fill right now, according to the LTN settings and the latest snapshot">
              imm
            </abbr>
          </th>
          <th>stop / block</th>
        </tr>
        {providers.map(([stop, value, min, flow]) => (
          <LtnAvailability
            stop={stop}
            avail={value}
            min={min}
            flows={{ flow, totalFlow }}
          />
        ))}
      </table>
    );
  }
}

export class LtnRequests extends Component<LtnFilter> {
  render(props: LtnFilter) {
    const requests = stations()
      .flatMap(([loc, stop]) => {
        const colon = props.colon;

        const combinators = colonMapCombinator(stop);
        const items = colonMapItems(stop);

        const v = expActLtn(combinators, items, colon);
        if (!v) return [];
        const { actual, expected } = v;

        const flow = stop.flowTo[colon] ?? 0;
        return [[[loc, stop], actual, expected, flow] as const];
      })
      .sort(
        ([, avalue, awanted], [, bvalue, bwanted]) =>
          avalue / awanted - bvalue / bwanted,
      );
    const totalFlow = requests.reduce((acc, [, , , flow]) => acc + flow, 0);

    return (
      <table className="ltn-avail">
        {requests.map(([stop, value, wanted, flow]) => (
          <LtnAvailability
            stop={stop}
            avail={value}
            min={wanted}
            decimate={true}
            flows={{ flow, totalFlow }}
          />
        ))}
      </table>
    );
  }
}

export const LtnFlow = ({
  flows: f,
}: {
  flows: { flow?: number; totalFlow?: number };
}) => (
  <abbr
    title={
      (f.flow?.toLocaleString('en') ?? 0) +
      ' items shipped during the simulation'
    }
  >
    {(((f.flow ?? 0) / (f.totalFlow ?? Infinity)) * 100).toFixed()}%
  </abbr>
);

export function expActLtn(
  combinators: Record<string, number>,
  items: Record<string, number>,
  colon: string,
) {
  const wantedItems = combinators[colon];
  if (!(wantedItems < 0)) {
    return null;
  }
  const computed = items[colon];

  const actualMinusWanted = computed ?? 0;
  // want 100: wanted = -100
  // actualMinusWanted -80 means there's 20 real items
  // percentage satisfaction: 20/100 = 20%
  const actual = actualMinusWanted - wantedItems;
  const expected = -wantedItems;

  return { actual, expected };
}
