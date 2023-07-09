import { Component } from 'preact';
import { useQuery } from 'preact-fetching';
import { data } from '../datae';
import { GpsLink } from '../lists';

interface Data {
  units: number[];
  deltas: number[][];
  statuses: number[][];
  times: number[];
}

interface State {
  gap?: number;
  steps?: number;
}

const KNOWN_STATUS: Record<number, string> = {
  1: 'working',
  2: 'normal',
  37: 'no power',
  12: 'low power',
  36: 'no fuel',
  38: 'disabled by control behaviour',
  41: 'disabled by script',
  43: 'marked for deconstruction',
  15: 'no recipe',
  20: 'fluid ingredient shortage',
  22: 'output full',
  21: 'item ingredient shortage',
};

const STATUS_FILLS: Record<number, string> = {
  1: 'rgba(0, 255, 0, 0.2)',
  20: 'rgba(192, 0, 0, 0.2)',
  21: 'rgba(255, 0, 63, 0.2)',
  22: 'rgba(255, 128, 0, 0.2)',
  36: 'rgba(0, 0, 255, 0.2)',
};

export class Craftings extends Component<{ units: string }, State> {
  render(props: { units: string }, state: State) {
    const units = props.units.split(',').map((u) => parseInt(u));
    const list = units.join(',');

    const quantisation = 15; // seconds
    const now =
      (Math.floor(Date.now() / 1000 / quantisation) + 1) * quantisation;

    const url = `https://facto-exporter.goeswhere.com/api/query?units=${list}&gap=${
      state.gap ?? 120
    }&steps=${state.steps ?? 10}&end=${now}`;

    const {
      isLoading,
      isError,
      error,
      data: fetched,
    } = useQuery(url, async () => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`fetch failure: ${resp.status}`);
      const data: Data = await resp.json();
      return data;
    });

    const d = fetched ?? { units: [], deltas: [], statuses: [], times: [] };

    const asms = Object.entries(data.doc)
      .flatMap(([block, v]) => v.asms.map((asm) => [block, ...asm] as const))
      .filter(([, , , , , unit]) => d.units.includes(unit));

    const byUnit: Record<number, { deltas: number[]; statuses: number[] }> = {};
    for (let i = 0; i < d.units.length; i++) {
      byUnit[d.units[i]] = { deltas: d.deltas[i], statuses: d.statuses[i] };
    }
    const start = new Date(d.times[0] * 1000).toTimeString().slice(0, 5);
    const end = new Date(d.times[d.times.length - 1] * 1000)
      .toTimeString()
      .slice(0, 5);

    if (isError) {
      console.error(error);
    }

    return (
      <div>
        {isError && (
          <p class={'alert alert-danger'}>There was an error: {error?.name}</p>
        )}
        <h3>
          Key
          {isLoading && <span> - A fetch is occurring...</span>}
        </h3>
        <table>
          {Object.entries(STATUS_FILLS).map(([num, fill]) => (
            <tr>
              <td style={`background-color: ${fill}`}>
                {KNOWN_STATUS[parseInt(num)]}
              </td>{' '}
            </tr>
          ))}
        </table>
        <p>
          <h3>Controls</h3>
          <button
            class={'btn btn-primary'}
            onClick={() =>
              this.setState(({ gap }) => ({
                gap: (gap ?? 120) + 10,
                data: undefined,
              }))
            }
          >
            Moar time
          </button>
          <button
            class={'btn btn-primary'}
            onClick={() =>
              this.setState(({ gap }) => ({
                gap: (gap ?? 120) - 10,
                data: undefined,
              }))
            }
          >
            Less time
          </button>
        </p>
        <h3>Graphs</h3>
        <ul>
          {asms.map(([block, factory, recipe, modules, pos, unit]) => {
            return (
              <li>
                <ProdGraph unit={byUnit[unit]} labels={{ start, end }} />
                <GpsLink caption={`TODO ${factory}`} gps={pos} /> {factory}{' '}
                making {recipe}{' '}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

function ProdGraph(props: {
  unit: { deltas: number[]; statuses: number[] };
  labels: Record<string, string>;
}) {
  const vs = props.unit.deltas;

  const max = Math.max(...vs);
  const count = vs.length;
  const W = 500;
  const H = 200;

  const points = vs.map(
    (v, i) => [(i / (count - 1)) * W, H - (v / max) * H] as const,
  );
  const ox = 100;

  const boxWidth = W / (points.length - 1) - 2;

  return (
    <svg viewBox="0 0 600 300" width="300" height="150">
      <line
        x1={100 - 5}
        y1={H}
        x2={ox + W}
        y2={H}
        stroke={'white'}
        stroke-width={2}
      />
      <line
        x1={100}
        y1={0}
        x2={ox}
        y2={H + 5}
        stroke={'white'}
        stroke-width={2}
      />
      <text x={100 - 10} y={15} fill="white" font-size={20} text-anchor={'end'}>
        {max}
      </text>
      <text
        x={100 - 10}
        y={H + 7}
        fill="white"
        font-size={20}
        text-anchor={'end'}
      >
        {0}
      </text>
      <text
        x={ox + 5}
        y={H + 20}
        fill="white"
        font-size={20}
        text-anchor={'start'}
      >
        {props.labels.start}
      </text>
      <text
        x={ox + W}
        y={H + 20}
        fill="white"
        font-size={20}
        text-anchor={'end'}
      >
        {props.labels.end}
      </text>
      {points.map((v, i) => {
        if (i === 0) return null;

        const fillColour = STATUS_FILLS[props.unit.statuses[i]] ?? 'white';

        const o = points[i - 1];
        return (
          <>
            <rect
              x={ox + v[0] - boxWidth / 2}
              y={0}
              width={boxWidth}
              height={H}
              fill={fillColour}
            />
            <line
              x1={ox + o[0]}
              y1={o[1]}
              x2={ox + v[0]}
              y2={v[1]}
              stroke={'orange'}
              stroke-width={2}
            />
          </>
        );
      })}
    </svg>
  );
}
