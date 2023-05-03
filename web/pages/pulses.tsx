import { Component } from 'preact';

import { easeQuadInOut } from 'd3-ease';
import { data, Loc, Pulse } from '../datae';
import { useEffect } from 'preact/hooks';
import { BlockLink } from './station-status';
import { splitColon } from '../muffler/colon';
import { ItemIcon } from '../lists';
import { stackSize } from './chestify';

function topN<T>(n: number, entries: (readonly [T, number])[]) {
  entries.sort((a, b) => b[1] - a[1]);
  const remainder = entries.slice(n);
  return {
    top: entries.slice(0, n),
    rest: remainder.reduce((a, b) => a + b[1], 0),
    names: remainder.map((e) => e[0]),
  } as const;
}

const W = 800;
// LTN convention; actual 2-wagon train can take 80 stacks?
const STACKS_PER_TRAIN = 50;

const Line = (props: { total: number; y: number; liner: Liner[] }) => {
  const iconList = (
    x: number,
    y: number,
    width: number,
    locs: string[],
    dir: 'flowTo' | 'flowFrom',
  ) => (
    <foreignObject
      x={x * 2}
      y={(props.y + y) * 2}
      width={width * 2}
      height={28}
      className={'node'}
      transform={'scale(0.5)'}
    >
      {[
        ...new Set(
          locs.flatMap((loc) =>
            data.doc[loc].stop.flatMap((s) => Object.keys(s[dir])),
          ),
        ),
      ]
        .sort()
        .map((colon) => (
          <ItemIcon alt={colon} name={splitColon(colon)[1]} />
        ))}
    </foreignObject>
  );

  return (
    <>
      {props.liner.map((blob) => {
        const ratio = blob.amount / props.total;
        const x = (blob.off / props.total) * W;
        const width = ratio * W - 3;
        return (
          <>
            <rect
              fill="#dee2e6"
              x={x}
              width={width}
              y={props.y}
              height="100"
              rx="5"
            />
            <text x={x + 4} y={props.y + 10} fill="black" font-size={'60%'}>
              {blob.names.slice(0, 4).map((loc, i) => (
                <>
                  <BlockLink loc={loc} />
                  {i !== 3 ? '; ' : ''}
                </>
              ))}
            </text>
            <text x={x + 4} y={props.y + 24} fill="black" font-size={'60%'}>
              {blob.names
                .map((loc) => data.doc[loc].tags.join('; '))
                .join('; ')
                .slice(0, width / 6)}
            </text>
            {iconList(x, 40, width, blob.names, 'flowTo')}
            {iconList(x, 60, width, blob.names, 'flowFrom')}
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

    const amountScale = stackSize(props.colon) * STACKS_PER_TRAIN;

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
        <svg width={'100%'} viewBox={`0 0 ${W} 1000`}>
          <Motion
            pulses={pulses}
            end={end}
            starts={totalise(srcLiner)}
            ends={totalise(sinkLiner)}
            amountScale={amountScale}
          />
          <Line y={0} total={total} liner={srcLiner} />
          <Line y={320} total={total} liner={sinkLiner} />
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
  const top = topN(8, Object.entries(bricks));
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
  amountScale: number;
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

        const [sx, sw] = props.starts[from]!;
        const [ex, ew] = props.ends[to]!;

        const fx = W * (sx + sw * (ex + sw / 2));
        const fy = 95;

        const tx = W * (ex + ew * (sx + sw / 2));
        const ty = 330;

        const ease = easeQuadInOut((now - start) / duration);
        const x = ease * (tx - fx) + fx;
        const y = ease * (ty - fy) + fy;
        return (
          <g key={`circ-${i}`}>
            <circle
              cx={x}
              cy={y}
              r={1 + (amount / props.amountScale) * 10}
              fill="red"
            />
          </g>
        );
      })
      .concat([
        <text style={'fill: white'} x={0} y={120}>
          {hoursMins} ({(t * 100).toFixed()}%)
        </text>,
      ]);
  }
}
