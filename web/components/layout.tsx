import { Component } from 'preact';
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
    const { inStations, outStations, belts, assemblers } = config;

    const FLOOR = '#312a03';
    const RAIL = '#8c8e8b';

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
            d="
          M 4 13 a 8 8 0 0 1 8 -8
          M 4 115 a 8 8 0 0 0 8 8
          M 188 13 a 8 8 0 0 0 -8 -8
          M 188 115 a 8 8 0 0 1 -8 8
          M 4 4 a 8 8 0 0 0 -8 -8
          M 188 4 a 8 8 0 0 1 8 -8
          M 4 124 a 8 8 0 0 1 -8 8
          M 188 124 a 8 8 0 0 0 8 8
          "
            stroke={RAIL}
            stroke-width={2}
            fill={'transparent'}
          />
          {/* stations */}
          {/*c 0 5, -5 -5, 8 13*/}
          {/*c 5 5, 0 -5, 8 8*/}
          <path
            d="M 4 13
          c 0 5, 5 5, 8 13
          c 5 5, 0 5, 8 8
          "
            stroke={RAIL}
            stroke-width={2}
            fill={'transparent'}
          />
          <path
            d="M 40 40 c 0 10, 30 0, 30 30 "
            stroke="#8c8e8b"
            stroke-width="2"
            fill="transparent"
          ></path>
        </g>
      </svg>
    );
  }
}
