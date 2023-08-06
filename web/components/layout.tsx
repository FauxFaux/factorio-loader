import { Component, JSX } from 'preact';
import { RecipeName } from '../muffler/walk-recipes';
import { Colon } from '../muffler/colon';

type Lanes = number;

type Pos = [number, number];
type Dim = [number, number];

export interface LayoutJob {
  recipe?: RecipeName;
  count: number;
  assembler: Dim;
  portsIn: Record<Colon, Lanes>;
  portsOut: Record<Colon, Lanes>;
}

export interface LayoutConfig {
  jobs: LayoutJob[];
  portsIn: Record<Colon, Lanes>;
  portsOut: Record<Colon, Lanes>;
}

interface LayoutProps {
  config: LayoutConfig;
}

export class Layout extends Component<LayoutProps> {
  render(props: LayoutProps) {
    return <TileRadar config={{}} />;
  }
}

type Path = Pos[];

interface RadarConfig {
  inStations: number;
  outStations: number;
  belts: Path[];
  assemblers: { loc: Pos; dim: Dim }[];
}

interface RadarProps {
  config: RadarConfig;
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

    inStations = 11;
    outStations = 11;

    const inRail = '4 13';
    const stops: JSX.Element[] = [];

    for (let i = 0; i < inStations; i++) {
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
        />,
      );
    }

    const outRail = '188 13';
    for (let i = 0; i < outStations; i++) {
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
        />,
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
          {/* inside curves, then outside curved track */}
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
