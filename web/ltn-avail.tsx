import { Component } from 'preact';

import { StopLine } from './pages/station-status';
import { Stat } from './muffler/stations';
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
    const f = props.flows;
    return (
      <tr>
        <td>{humanise(props.avail)}</td>
        <td>
          <abbr
            title={
              (f?.flow?.toLocaleString('en') ?? 0) +
              ' items shipped during the simulation'
            }
          >
            {((f?.flow / f?.totalFlow) * 100).toFixed()}%
          </abbr>
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
