import { Component } from 'preact';
import type { Ping } from '../../scripts/load-cp-train';

interface TrainTrafficState {
  fetch?: {
    data?: unknown;
    err?: Error;
  };
}

const W = 1000;

export class TrainTraffic extends Component<{}, TrainTrafficState> {
  componentDidMount() {
    fetch('/data/cpt/meta.json')
      .then((r) => r.json())
      .then((data) => this.setState({ fetch: { data } }))
      .catch((err) => this.setState({ fetch: { err } }));
  }

  render(props: unknown, state: TrainTrafficState) {
    if (!state.fetch) {
      return <div>Loading...</div>;
    }
    if (state.fetch.err) {
      return <div>ERROH: {state.fetch.err.message}</div>;
    }

    const data = state.fetch.data! as {
      // train name
      byTrain: Record<string, Ping[]>;
    };

    const xs = Object.values(data.byTrain).flatMap((pings) =>
      pings.map((ping) => ping[1]),
    );
    const ys = Object.values(data.byTrain).flatMap((pings) =>
      pings.map((ping) => ping[2]),
    );
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    const toX = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
    const toY = (y: number) =>
      ((y - yMin) / (yMax - yMin)) * W * (1 / (800 / 600));

    return (
      <svg width={'100%'} viewBox={`0 0 ${W} ${W}`}>
        {Object.entries(data.byTrain)
          .filter(([train]) => train === '751')
          .map(([train, pings]) =>
            pings
              .filter(([, , , , dx, dy]) => dx !== 0 && dy !== 0)
              .map((ping) => {
                const [tick, x, y, s, dx, dy] = ping;

                return (
                  <>
                    <circle
                      cx={toX(x)}
                      cy={toY(y)}
                      r={2}
                      fill={hslToHex((s / 255) * 130, 50, 50)}
                    />
                    {/*<line x1={toX(x)} y1={toY(y)} x2={toX(dx)} y2={toY(dy)} stroke={'green'} />*/}
                  </>
                );
              }),
          )}
      </svg>
    );
  }
}

// svg wouldn't accept hsl()?
function hslToHex(h: number, s: number, l: number) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0'); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
