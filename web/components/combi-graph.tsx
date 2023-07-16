import { Component, JSX } from 'preact';
import { useQuery } from 'preact-fetching';
import * as qs from 'qs';
import { KNOWN_STATUS, STATUS_FILLS } from '../pages/craftings';
import { statusSort } from '../pages/bulk-craftings';

export class CombiGraph extends Component<{ units: number[] }> {
  render(props: { units: number[] }) {
    const url =
      'https://facto-exporter.goeswhere.com/api/long?' +
      qs.stringify({
        units: props.units.join(','),
        start: '2023-07-11T18:00:00Z',
        end: '2023-07-12T01:00:00Z',
        steps: 100,
      });
    const {
      isLoading,
      isError,
      error,
      data: fetched,
    } = useQuery(url, async () => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`fetch failure: ${resp.status}`);

      interface Body {
        units: number[];
        summary: { o: number; ds: [string, string] }[];
        steps: { s: Record<string, number>; p: number }[][];
      }

      const body: Body = await resp.json();

      const steps = body.steps.map((step) => {
        const stepTotal: { status: Record<string, number>; products: number } =
          { status: {}, products: 0 };
        for (const unit of step) {
          for (const [status, count] of Object.entries(unit.s)) {
            if (!stepTotal.status[status]) stepTotal.status[status] = 0;
            stepTotal.status[status] += count;
          }
          stepTotal.products += unit.p;
        }
        return stepTotal;
      });

      return { summary: body.summary, steps };
    });
    if (isLoading) {
      return <div>Loading...</div>;
    }
    if (isError || !fetched) {
      console.error(error);
      return <div class={'alert alert-danger'}>ERROH: {error?.message}</div>;
    }

    const ts = (v: string | Date) => new Date(v).toTimeString().slice(0, 5);

    const vs = fetched.steps.map((step) => step.products);

    const max = Math.max(...vs) || 1;
    const count = vs.length;
    const W = 1300;
    const H = 130;

    const points = vs.map(
      (v, i) => [(i / (count - 1)) * W, H - (v / max) * H] as const,
    );
    const XOFF = 40;
    const PT = 14;

    const boxWidth = W / (points.length - 1) - 2;

    const totalW = W + XOFF;
    const totalH = H + PT + 6;

    return (
      <svg viewBox={`0 0 ${totalW} ${totalH}`} width={totalW} height={totalH}>
        <line
          x1={XOFF - 5}
          y1={H}
          x2={XOFF + W}
          y2={H}
          stroke={'white'}
          stroke-width={2}
        />
        <line
          x1={XOFF}
          y1={0}
          x2={XOFF}
          y2={H + 5}
          stroke={'white'}
          stroke-width={2}
        />
        <text
          x={XOFF - 10}
          y={14}
          fill="white"
          font-size={PT}
          text-anchor={'end'}
        >
          {max}
        </text>
        <text
          x={XOFF - 10}
          y={H + 5}
          fill="white"
          font-size={PT}
          text-anchor={'end'}
        >
          {0}
        </text>
        <text
          x={XOFF + 2}
          y={H + PT}
          fill="white"
          font-size={PT}
          text-anchor={'start'}
        >
          {ts(fetched.summary[0].ds[0])}
        </text>
        <text
          x={XOFF + W}
          y={H + PT}
          fill="white"
          font-size={PT}
          text-anchor={'end'}
        >
          {ts(fetched.summary[fetched.summary.length - 1].ds[1])}
        </text>
        {points.map((v, i) => {
          if (i === 0) return null;

          const statuses = fetched.steps[i].status;
          const statusTotal = Object.values(statuses).reduce(
            (a, b) => a + b,
            0,
          );

          const o = points[i - 1];
          const [ox, oy] = o;
          const [vx, vy] = v;
          const fillX = XOFF + vx - boxWidth;
          const fillW = boxWidth;

          const rects: JSX.Element[] = [];
          let currentH = 0;

          Object.entries(statuses)
            .sort(([a], [b]) => statusSort(a) - statusSort(b))
            .map(([status, count]) => {
              const fillColour = STATUS_FILLS[status as any] ?? 'white';
              const ourH = (count / statusTotal) * H;
              rects.push(
                <rect
                  x={fillX}
                  y={currentH}
                  width={fillW}
                  height={ourH}
                  fill={fillColour}
                >
                  <title>
                    {count} assemblers in{' '}
                    {KNOWN_STATUS[status] ?? `?${status}?`}
                  </title>
                </rect>,
              );
              currentH += ourH;
            });

          return (
            <>
              {rects}
              <line
                x1={XOFF + ox}
                y1={oy}
                x2={XOFF + vx}
                y2={vy}
                stroke={'orange'}
                stroke-width={2}
              />
            </>
          );
        })}
      </svg>
    );
  }
}
