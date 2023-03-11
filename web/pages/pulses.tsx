import { Component } from 'preact';

import * as d3 from 'd3';
import { data, Loc } from '../datae';

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

export class Pulses extends Component {
  render() {
    const pulses = data.trainPulses.byColon['item:coke'];
    const sources: Record<Loc, number> = {};
    const sinks: Record<Loc, number> = {};
    let total = 0;
    for (const pulse of pulses) {
      const [from, to, , , amount] = pulse;
      sources[from] = (sources[from] ?? 0) + amount;
      sinks[to] = (sinks[to] ?? 0) + amount;
      total += amount;
    }

    const w = 800;

    return (
      <div class={'row'}>
        <svg width={'100%'} viewBox={'0 0 800 1000'}>
          <Line y={0} total={total} w={w} bricks={sources} />
          <Line y={320} total={total} w={w} bricks={sinks} />
        </svg>
      </div>
    );
  }
}
