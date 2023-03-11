import { Component } from 'preact';

import * as ease from 'd3-ease';
import { data, Loc, Pulse } from '../datae';
import { useEffect } from 'preact/hooks';

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
  bricks: Record<Loc, number>;
}) => {
  const top = topN(4, Object.entries(props.bricks));
  const items = top.top
    .map(([loc, amount]) => [amount, loc] as const)
    .concat([[top.rest, 'rest']] as const);

  return items.map(([ratio, loc], i) => {
    const x =
      (items
        .slice(0, i)
        .map(([r]) => r)
        .reduce((a, b) => a + b, 0) *
        props.w) /
      props.total;
    return (
      <>
        <rect
          style={'opacity: 0.05'}
          fill="red"
          x={x}
          width={(ratio * props.w) / props.total - 3}
          y={props.y}
          height="100"
          rx="5"
        />
        <text x={x} y={props.y + 80} fill="black">
          {loc}
        </text>
      </>
    );
  });
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

    return (
      <div class={'row'}>
        <svg width={'100%'} viewBox={'0 0 800 1000'}>
          <Line y={0} total={total} w={w} bricks={sources} />
          <Line y={320} total={total} w={w} bricks={sinks} />
          <Motion pulses={pulses} end={end} />
        </svg>
      </div>
    );
  }
}

class Motion extends Component<
  { pulses: Pulse[]; end: number },
  { t: number }
> {
  render(props: { pulses: Pulse[]; end: number }, state: { t: number }) {
    useEffect(() => {
      const timer = setInterval(() => {
        this.setState(({ t }) => ({ t: (t ?? 0) + 0.0001 }));
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
        const fromPair = from
          .split(',')
          .map((s) => 20 * (parseInt(s) + 10)) as [number, number];
        const toPair = to.split(',').map((s) => 20 * (parseInt(s) + 10)) as [
          number,
          number,
        ];
        const x =
          ease.easeQuadInOut((now - start) / duration) *
            (toPair[0] - fromPair[0]) +
          fromPair[0];
        const y =
          ease.easeQuadInOut((now - start) / duration) *
            (toPair[1] - fromPair[1]) +
          fromPair[1];
        return (
          <g>
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
