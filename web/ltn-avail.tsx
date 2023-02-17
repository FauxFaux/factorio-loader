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

  /** colour at 1/10th */
  decimate?: boolean;
}
export class LtnAvailability extends Component<LtnAvailabilityProps> {
  render(props: LtnAvailabilityProps) {
    return (
      <tr>
        <td>{humanise(props.avail)}</td>
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
