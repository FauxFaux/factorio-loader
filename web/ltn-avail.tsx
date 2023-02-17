import { Stat, StopLine } from './pages/station-status';
import { Component } from 'preact';
import { Measurement } from './ltn-summary';

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

export function humaniseNo(count: number): string {
  if (count > 1e6)
    return (
      (count / 1e6).toLocaleString('en', { maximumFractionDigits: 0 }) + 'M'
    );
  if (count > 1e3)
    return (
      (count / 1e3).toLocaleString('en', { maximumFractionDigits: 0 }) + 'k'
    );
  return count.toLocaleString('en', { maximumFractionDigits: 0 });
}

export function humanise(count: number) {
  if (count > 1e6)
    return (
      <abbr
        title={`${count.toLocaleString('en', { maximumFractionDigits: 0 })}`}
      >
        {(count / 1e6).toFixed() + 'M'}
      </abbr>
    );
  if (count > 1e3)
    return (
      <abbr
        title={`${count.toLocaleString('en', { maximumFractionDigits: 0 })}`}
      >
        {(count / 1e3).toFixed() + 'k'}
      </abbr>
    );
  return <abbr title="just a piddly digit">{count}</abbr>;
}
