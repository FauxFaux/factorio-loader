import { Component } from 'preact';
import { useEffect } from 'preact/hooks';
import { addOffset, toBlock } from '../../scripts/magic';
import { data } from '../datae';

// these number[]s are 3-tuples concatenated; x, y, count
type File = { produced: number[]; consumed: number[] }[];

// concatenated positions; i.e. `${x},${y}`
type ConcPos = string;
type ConcPosCount = Record<ConcPos, number>;

const W = 1000;

interface HeatsState {
  fetch?:
    | {
        success: File;
      }
    | { err: Error };
}

export class Heats extends Component<{ colon: string }, HeatsState> {
  render(props: { colon: string }, state: HeatsState) {
    if (state.fetch && 'err' in state.fetch) {
      return <div class={'row'}>ERROH: {state.fetch!.err.message}</div>;
    }
    if (!state.fetch || !('success' in state.fetch)) {
      fetch(`/data/cp/${props.colon.replace(':', '-')}.json`)
        .then((r) => r.json())
        .then((data) => this.setState({ fetch: { success: data } }))
        .catch((err) => this.setState({ fetch: { err } }));
      return <div class={'row'}>Loading...</div>;
    }

    const file = state.fetch.success;

    const unpacked = file.map((event) => ({
      produced: unpackTriplets(event.produced),
      consumed: unpackTriplets(event.consumed),
    }));

    const values = unpacked
      .flatMap((event) => Object.values(event.produced))
      .sort();
    const scale = values[Math.floor(values.length * 0.95)];

    return (
      <svg width={'100%'} viewBox={`0 0 ${W} 1000`}>
        <Griddle unpacked={unpacked} scale={scale} />
      </svg>
    );
  }
}

function unpackTriplets(triplets: number[]): ConcPosCount {
  const result: ConcPosCount = {};
  for (let i = 0; i < triplets.length; i += 3) {
    const [x, y, count] = triplets.slice(i, i + 3);
    const key = `${x},${y}`;
    result[key] = count;
  }
  return result;
}

function rangeFrom(n: number, m: number) {
  return Array.from({ length: m - n }, (_, i) => i + n);
}

type Unpacked = {
  produced: ConcPosCount;
  consumed: ConcPosCount;
};

type GriddleProps = { unpacked: Unpacked[]; scale: number };

class Griddle extends Component<GriddleProps, { t: number }> {
  render(props: GriddleProps, state: { t: number }) {
    useEffect(() => {
      const timer = setInterval(() => {
        this.setState(({ t }) => ({ t: (t ?? 0.0) + 1 }));
      }, 1000 / 60);
      return () => clearTimeout(timer);
    }, []);
    const events = props.unpacked;
    const t = (state.t ?? 0) % events.length;
    const event = events[t];

    const SQ = 5;

    const LX = -50;
    const HX = 40;

    const LY = -28;
    const HY = 80;

    const flashies = rangeFrom(LY, HY).flatMap((y) =>
      rangeFrom(LX, HX).flatMap((x) => {
        const p = `${x},${y}`;
        const r = (event.consumed[p] ?? 0) / props.scale;
        const g = (event.produced[p] ?? 0) / props.scale;
        if (!(g > 0 || r > 0)) {
          return [];
        }

        const [gpsx, gpsy] = addOffset([x * 32, y * 32]);
        const tags =
          data.doc[String(toBlock([gpsx, gpsy]))]?.tags?.join(',') ?? '?';

        return [
          <rect
            key={p}
            x={(x - LX) * SQ}
            y={(y - LY) * SQ}
            width={SQ}
            height={SQ}
            fill={`rgb(${r * 255},${g * 255},0)`}
          >
            <title>
              [gps={gpsx},{gpsy}] {tags}
            </title>
          </rect>,
        ];
      }),
    );

    const lines = [<></>];
    for (let y = LY; y < HY; y += 4) {
      lines.push(
        <line
          x1={0}
          y1={(y - LY) * SQ}
          x2={(HX - LX) * SQ}
          y2={(y - LY) * SQ}
          stroke={'white'}
          stroke-width={0.2}
        />,
      );
    }

    return (
      <>
        {flashies}
        {lines}
        <rect
          x={(0 - LX) * SQ}
          y={(0 - LY) * SQ}
          width={5}
          height={5}
          fill={'white'}
        />
        <rect
          x={0}
          y={0}
          width={(HX - LX) * SQ * (t / events.length)}
          height={10}
          fill={'white'}
        />
      </>
    );
  }
}
