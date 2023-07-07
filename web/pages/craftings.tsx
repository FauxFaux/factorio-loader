import { Component } from 'preact';
import { useEffect } from 'preact/hooks';
import { data } from '../datae';
import { GpsLink } from '../lists';

interface Data {
  units: number[];
  deltas: number[][];
  times: number[];
}

interface State {
  data?: Data | null;
}

export class Craftings extends Component<{ units: string }, State> {
  render(props: { units: string }, state: State) {
    const units = props.units.split(',').map((u) => parseInt(u));

    useEffect(() => {
      // already filled
      if (state.data !== undefined) return;
      void (async () => {
        try {
          const list = units.join(',');
          const resp = await fetch(
            `https://facto-exporter.goeswhere.com/api/query?units=${list}&gap=120&steps=10`,
          );
          if (!resp.ok) throw new Error(`fetch failure: ${resp.status}`);
          const data = await resp.json();
          this.setState({ data });
        } catch (err) {
          console.error(err);
          this.setState({ data: null });
        }
      })();
    }, [units]);

    if (!state.data) {
      return <div>Loading or failed...</div>;
    }

    const asms = Object.entries(data.doc)
      .flatMap(([block, v]) => v.asms.map((asm) => [block, ...asm] as const))
      .filter(([, , , , , unit]) => units.includes(unit));

    const byUnit: Record<number, number[]> = {};
    const d = state.data!;
    for (let i = 0; i < d.units.length; i++) {
      byUnit[d.units[i]] = d.deltas[i];
    }
    const start = new Date(d.times[0] * 1000).toTimeString().slice(0, 5);
    const end = new Date(d.times[d.times.length - 1] * 1000)
      .toTimeString()
      .slice(0, 5);

    return (
      <div>
        <ul>
          {asms.map(([block, factory, recipe, modules, pos, unit]) => {
            return (
              <li>
                <ProdGraph vals={byUnit[unit]} labels={{ start, end }} />
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

function ProdGraph(props: { vals: number[]; labels: Record<string, string> }) {
  const vs = props.vals;

  const max = Math.max(...vs);
  const count = vs.length;
  const W = 500;
  const H = 200;

  const points = vs.map(
    (v, i) => [(i / (count - 1)) * W, H - (v / max) * H] as const,
  );
  const ox = 100;

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

        const o = points[i - 1];
        return (
          <line
            x1={ox + o[0]}
            y1={o[1]}
            x2={ox + v[0]}
            y2={v[1]}
            stroke={'orange'}
            stroke-width={2}
          />
        );
      })}
    </svg>
  );
}
