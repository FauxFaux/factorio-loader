import { Component } from 'preact';

import { easeQuadInOut } from 'd3-ease';
import { data, Loc, Pulse } from '../datae';
import { useEffect } from 'preact/hooks';
import { BlockLink } from './station-status';

function topN<T>(n: number, entries: (readonly [T, number])[]) {
  entries.sort((a, b) => b[1] - a[1]);
  const remainder = entries.slice(n);
  return {
    top: entries.slice(0, n),
    rest: remainder.reduce((a, b) => a + b[1], 0),
    names: remainder.map((e) => e[0]),
  } as const;
}

const Line = (props: {
  total: number;
  w: number;
  y: number;
  liner: Liner[];
}) => {
  return (
    <>
      {props.liner.map((blob) => {
        const ratio = blob.amount / props.total;
        const x = (blob.off / props.total) * props.w;
        console.log(blob, props);
        const width = ratio * props.w - 3;
        return (
          <>
            <rect
              fill="red"
              x={x}
              width={width}
              y={props.y}
              height="100"
              rx="5"
            />
            <text
              x={x + width / 2}
              y={props.y + 10}
              text-anchor={'middle'}
              fill="black"
              font-size={'60%'}
            >
              {blob.names.slice(0, 4).map((loc, i) => (
                <>
                  <BlockLink loc={loc} />
                  {i !== 3 ? '; ' : ''}
                </>
              ))}
            </text>
            <text
              x={x + width / 2}
              y={props.y + 20}
              text-anchor={'middle'}
              fill="black"
              font-size={'60%'}
            >
              {blob.names
                .map((loc) => data.doc[loc].tags.join('; '))
                .join('; ')
                .slice(0, 20)}
            </text>
          </>
        );
      })}
    </>
  );
};

export class Pulses extends Component<{ colon: string }> {
  render(props: { colon: string }) {
    const pulses = data.trainPulses.byColon[props.colon];
    const sources: Record<Loc, number> = {};
    const sinks: Record<Loc, number> = {};
    let total = 0;
    let end = 0;
    for (const pulse of pulses) {
      const [from, to, start, duration, amount] = pulse;
      sources[from] = (sources[from] ?? 0) + amount;
      sinks[to] = (sinks[to] ?? 0) + amount;
      total += amount;
      end = Math.max(end, start + duration);
    }

    const w = 800;

    const srcLiner = computeLine(sources);
    const sinkLiner = computeLine(sinks);

    function totalise(liners: Liner[]) {
      return Object.fromEntries(
        liners.flatMap(({ names, off, amount }) =>
          names.map((name) => [name, [off / total, amount / total] as const]),
        ),
      );
    }

    return (
      <div class={'row'}>
        <svg width={'100%'} viewBox={'0 0 800 1000'}>
          <Line y={0} total={total} w={w} liner={srcLiner} />
          <Line y={320} total={total} w={w} liner={sinkLiner} />
          <Motion
            pulses={pulses}
            end={end}
            starts={totalise(srcLiner)}
            ends={totalise(sinkLiner)}
          />
        </svg>
      </div>
    );
  }
}

interface Liner {
  amount: number;
  names: string[];
  off: number;
}

function computeLine(bricks: Record<Loc, number>): Liner[] {
  const top = topN(5, Object.entries(bricks));
  const items = top.top
    .map(([loc, amount]) => [amount, [loc] as string[]] as const)
    .concat([[top.rest, top.names]] as const);

  return items.map(([amount, names], i) => ({
    amount,
    names,
    // sum of amounts up to this point (*not* divided by total)
    off: items
      .slice(0, i)
      .map(([amount]) => amount)
      .reduce((a, b) => a + b, 0),
  }));
}

interface MotionProps {
  pulses: Pulse[];
  end: number;
  starts: Record<Loc, readonly [number, number]>;
  ends: Record<Loc, readonly [number, number]>;
}
class Motion extends Component<MotionProps, { t: number }> {
  render(props: MotionProps, state: { t: number }) {
    useEffect(() => {
      const timer = setInterval(() => {
        this.setState(({ t }) => ({ t: (t ?? 0.02) + 0.0001 }));
      }, 1000 / 60);
      return () => clearTimeout(timer);
    }, []);
    const { pulses } = props;
    const t = (state.t ?? 0) % 1;

    const mins = (t * props.end) / 42 / 60;
    const hoursMins = `${Math.floor(mins / 60)}h${(mins % 60)
      .toFixed(0)
      .padStart(2, '0')}`;
    return pulses
      .flatMap((pulse, i) => {
        const now = t * props.end;
        const [from, to, start, duration, amount] = pulse;
        if (now < start || now > start + duration) {
          return [];
        }
        const w = 800;

        const [sx, sw] = props.starts[from]!;
        const [ex, ew] = props.ends[to]!;

        const fx = w * (sx + sw / 2);
        const fy = 95;

        const tx = w * (ex + ew / 2);
        const ty = 330;

        const ease = easeQuadInOut((now - start) / duration);
        const x = ease * (tx - fx) + fx;
        const y = ease * (ty - fy) + fy;
        return (
          <g key={`circ-${i}`}>
            <circle cx={x} cy={y} r={3 + Math.log(amount)} fill="red" />
          </g>
        );
      })
      .concat([
        <text style={'fill: white'} x={20} y={20}>
          {hoursMins} ({(t * 100).toFixed()}%)
        </text>,
      ]);
  }
}
