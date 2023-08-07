import { Component, JSX } from 'preact';
import { RecipeName } from '../muffler/walk-recipes';
import { Colon } from '../muffler/colon';

export type Lanes = number;

type Pos = [number, number];
type Dim = [number, number];

export interface District {
  recipe?: RecipeName;
  count: number;
  assembler: Dim;
  portsIn: Record<Colon, Lanes>;
  portsOut: Record<Colon, Lanes>;
}

export interface LayoutConfig {
  districts: District[];
  inPerSec: Record<Colon, number>;
  outPerSec: Record<Colon, number>;
}

interface LayoutProps {
  config: LayoutConfig;
}

export class Layout extends Component<LayoutProps> {
  render(props: LayoutProps) {
    const { config } = props;
    const { districts, inPerSec, outPerSec } = config;
    const inStations = allocStations(inPerSec);
    const outStations = allocStations(outPerSec);

    const grid = new Grid();
    grid.fill(0, 0, 8, 8);
    grid.fill(Grid.W - 8, 0, 8, 8);
    grid.fill(0, Grid.H - 8, 8, 8);
    grid.fill(Grid.W - 8, Grid.H - 8, 8, 8);

    // some kind of determinism?
    districts.sort((a, b) => {
      let n = b.count - a.count;
      if (n !== 0) return n;
      return (b.recipe ?? '').localeCompare(a.recipe ?? '');
    });

    const toPlace = [...districts];

    const currentlyAvailable = new Set<Colon>();
    for (const stat of inStations) {
      for (const colon of Object.keys(stat.ports)) {
        currentlyAvailable.add(colon);
      }
    }

    const radar: RadarConfig = {
      inStations: inStations.map((s) => ({ label: Object.keys(s.ports) })),
      outStations: outStations.map((s) => ({ label: Object.keys(s.ports) })),
      assemblers: [],
      belts: [],
    };

    while (toPlace.length > 0) {
      let placeIdx = toPlace.findIndex((d) =>
        Object.keys(d.portsIn).every((c) => currentlyAvailable.has(c)),
      );
      if (placeIdx === -1) placeIdx = 0;
      const placing = toPlace.splice(placeIdx, 1)[0];
      const maxH = 100;
      const [w, h] = placing.assembler;
      const ourAssems = [];
      let [cx, cy] = [0, 0];
      for (let i = 0; i < placing.count; i++) {
        ourAssems.push([cx, cy]);
        cy += h;
        if (cy >= maxH) {
          cy = 0;
          cx += w;
        }
      }
    }

    return <TileRadar config={radar} />;
  }
}

const fill = (perSec: Record<Colon, number>) =>
  Object.values(perSec).reduce((a, b) => a + b, 0);

function allocStations(perSec: Record<Colon, number>) {
  // const total = Object.values(perSec).reduce((a, b) => a + b, 0);
  // const stationCount = Math.ceil(total / 30);
  const stations: {
    ports: Record<Colon, number>;
  }[] = [];
  placed: for (const [colon, rate] of Object.entries(perSec)
    .map(([colon, rate]) => [colon, Math.abs(rate)] as const)
    .sort(([, a], [, b]) => b - a)) {
    for (const station of stations) {
      if (Object.keys(station.ports).length < 4 && fill(station.ports) <= 30) {
        station.ports[colon] = rate;
        continue placed;
      }
    }
    stations.push({ ports: { [colon]: rate } });
  }

  return stations;
}

type Path = Pos[];

interface RadarStation {
  label: Colon[];
}

interface RadarConfig {
  inStations: RadarStation[];
  outStations: RadarStation[];
  belts: Path[];
  assemblers: { loc: Pos; dim: Dim }[];
}

interface RadarProps {
  config: RadarConfig;
}

class Grid {
  static readonly W = 192 - 8;
  static readonly H = 128 - 8;
  inner: boolean[] = Array(this.W * this.H).fill(false);
  get = (x: number, y: number) => this.inner[x + y * this.W];
  set = (x: number, y: number) => (this.inner[x + y * this.W] = true);
  fill = (x: number, y: number, w: number, h: number) => {
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        this.set(x + i, y + j);
      }
    }
  };

  clone = () => {
    const g = new Grid();
    g.inner = this.inner.slice();
    return g;
  };

  toString = () => {
    let s = '';
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        s += this.get(x, y) ? 'X' : '.';
      }
      s += '\n';
    }
    return s;
  };
}

class TileRadar extends Component<RadarProps> {
  render(props: RadarProps) {
    const { config } = props;
    let { inStations, outStations, belts, assemblers } = config;

    const FLOOR = '#312a03';
    const RAIL = '#8c8e8b';

    const c2 = ([svx, svy]: Pos, [evx, evy]: Pos, [ex, ey]: Pos) =>
      `c ${svx} ${svy}, ${evx + ex} ${evy + ey}, ${ex} ${ey} `;

    const rails = [
      // inside corners
      'M 4 13 a 8 8 0 0 1 8 -8',
      'M 4 115 a 8 8 0 0 0 8 8',
      'M 188 13 a 8 8 0 0 0 -8 -8',
      'M 188 115 a 8 8 0 0 1 -8 8',
      // outside curved track from the junctions
      'M 4 4 a 8 8 0 0 0 -8 -8',
      'M 188 4 a 8 8 0 0 1 8 -8',
      'M 4 124 a 8 8 0 0 1 -8 8',
      'M 188 124 a 8 8 0 0 0 8 8',
    ];

    const inRail = '4 13';
    const stops: JSX.Element[] = [];

    for (let i = 0; i < inStations.length; i++) {
      const off = 8 * (i + 1);
      const p = 8 + i;
      rails.push(
        `M ${inRail}`,
        c2([0, p], [0, -p], [off, 20]),
        'l 0 60',
        c2([0, p], [0, -p], [-off, 20]),
      );

      stops.push(
        <circle
          cx={4 + off - 2}
          cy={84}
          r={1.8}
          fill={'white'}
          stroke={'black'}
        >
          <title>{inStations[i].label.join(', ')}</title>
        </circle>,
      );
    }

    const outRail = '188 13';
    for (let i = 0; i < outStations.length; i++) {
      const off = -8 * (i + 1);
      const p = 8 + i;
      rails.push(
        `M ${outRail}`,
        c2([0, p], [0, -p], [off, 20]),
        'l 0 60',
        c2([0, p], [0, -p], [-off, 20]),
      );

      stops.push(
        <circle
          cx={188 + off + 2}
          cy={38}
          r={1.8}
          fill={'white'}
          stroke={'black'}
        >
          <title>{outStations[i].label.join(', ')}</title>
        </circle>,
      );
    }

    return (
      <svg viewBox="0 0 192 128" width={192 * 3} height={128 * 3}>
        <g>
          <rect x={0} y={0} width={192} height={128} fill={FLOOR} />
          {/* border rails */}
          <rect x={3} y={4} width={2} height={120} fill={RAIL} />
          <rect x={192 - 3 - 2} y={4} width={2} height={120} fill={RAIL} />
          <rect x={0} y={4} width={192} height={2} fill={RAIL} />
          <rect x={0} y={128 - 4 - 2} width={192} height={2} fill={RAIL} />
          <path
            d={rails.join(' ')}
            stroke={RAIL}
            stroke-width={2}
            fill={'transparent'}
          />
          {stops}
        </g>
      </svg>
    );
  }
}
