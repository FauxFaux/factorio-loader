import { Component, JSX } from 'preact';
import { makeUpRecipe, RecipeName } from '../muffler/walk-recipes';
import { Colon } from '../muffler/colon';
import { data } from '../datae';
import { ItemIcon } from '../lists';

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
      icons: [],
    };

    const busSize = 4;
    const [tx, ty] = [8 + 8 * radar.inStations.length, 8 + 4 + busSize];
    let [cx, cy] = [tx, ty];

    let firstOut = undefined;

    while (toPlace.length > 0) {
      let placeIdx = toPlace.findIndex((d) =>
        Object.keys(d.portsIn).every((c) => currentlyAvailable.has(c)),
      );
      if (placeIdx === -1) placeIdx = 0;
      const placing = toPlace.splice(placeIdx, 1)[0];
      const maxH = 100;
      const inLanes = Object.values(placing.portsIn).reduce(
        (a, b) => a + Math.ceil(b),
        0,
      );
      const outLanes = Object.values(placing.portsOut).reduce(
        (a, b) => a + Math.ceil(b),
        0,
      );

      const [w, h] = placing.assembler;
      const sy = 0;
      // TODO: lanes > 2
      let sxi = inLanes / 2;
      let sxo = outLanes / 2;
      if (sxi > 0) sxi += 1;
      if (sxo > 0) sxo += 1;

      if (
        firstOut === undefined &&
        Object.keys(placing.portsOut).some((colon) => outPerSec[colon] > 0)
      ) {
        firstOut = cx + w + sxi + 2;
      }

      // const ass = radar.assemblers;
      // for (let i = 0; i < placing.count; i++) {
      //   ass.push({ loc: [cx, cy], dim: [w, h], recipe: placing.recipe });
      //   cy += h + sy;
      //   if (cy >= maxH) {
      //     cy = ty;
      //     cx += w + sxo + sxi;
      //   }
      // }
      //
      // if (cy > maxH / 2) {
      //   cy = ty;
      //   cx += w + sxo + sxi;
      // } else if (cy > 0) {
      //   cy = ty + maxH / 2;
      // }

      const d = oneTwo(
        placing.count,
        {
          w,
          h,
          sxo,
          sxi,
          sy,
        },
        maxH,
      );

      console.log(placing, d);

      radar.belts.push(
        ...d.belts.map((path) =>
          path.map(([lx, ly]) => [lx + cx, ly + cy] as Pos),
        ),
      );
      radar.assemblers.push(
        ...d.asms.map(([lx, ly]) => ({
          loc: [lx + cx, ly + cy] as Pos,
          dim: placing.assembler,
          recipe: placing.recipe,
        })),
      );

      const [dx, dy] = d.bound;

      if (placing.recipe) {
        radar.icons.push([[cx + (dx + 4) / 2, cy + dy / 2], placing.recipe]);
      }

      cx += dx + 4;
    }

    for (let i = 0; i < busSize; ++i) {
      const y = ty - busSize - 4 + i;
      radar.belts.push([
        [8, y],
        [cx, y],
      ]);
      radar.belts.push([
        [firstOut ?? 8, y + busSize],
        [180, y + busSize],
      ]);
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
  assemblers: { loc: Pos; dim: Dim; recipe?: RecipeName }[];
  icons: [Pos, RecipeName][];
}

interface RadarProps {
  config: RadarConfig;
}

class Grid {
  static readonly W = 192 - 8;
  static readonly H = 128 - 8;
  inner: boolean[] = Array(Grid.W * Grid.H).fill(false);
  get = (x: number, y: number) => this.inner[x + y * Grid.W];
  set = (x: number, y: number) => (this.inner[x + y * Grid.W] = true);
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
    for (let y = 0; y < Grid.H; y++) {
      for (let x = 0; x < Grid.W; x++) {
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

    const asms = assemblers.map(({ loc: [x, y], dim: [w, h], recipe }) => (
      <rect x={x} y={y} width={w} height={h} fill={'#006194'}>
        <title>{recipe}</title>
      </rect>
    ));

    // const icons = config.icons.map(([[x, y], recipe]) => (
    //   <image
    //     x={x - 4} y={y - 4} width={3392} height={3328}
    //     href={'../data/icons.png'}
    //     clip-path="url(#myClip)"
    //   >
    //     <title>{data.recipes.regular[recipe].localised_name}</title>
    //   </image>
    // ));
    // TODO: shrink
    const icons = config.icons.map(([[x, y], recipe]) => (
      <foreignObject x={x - 16} y={y - 16} width={32} height={32}>
        <ItemIcon
          name={recipe}
          alt={makeUpRecipe(recipe)?.localised_name ?? '??'}
        />
      </foreignObject>
    ));

    const belties = belts.map((path) => {
      const [sx, sy] = path[0];
      return (
        <path
          d={
            `M ${sx} ${sy} ` +
            path
              .slice(1)
              .map(([x, y]) => `L ${x} ${y}`)
              .join(' ')
          }
          stroke={'#c89d40'}
        />
      );
    });

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
          {/*<clipPath id="myClip" clipPathUnits="objectBoundingBox">*/}
          {/*  <rect x={0.02} y={0.02} width={0.01} height={0.01}/>*/}
          {/*</clipPath>*/}
          <rect x={0} y={0} width={192} height={128} fill={FLOOR} />
          {/* border rails */}
          <rect x={3} y={4} width={2} height={120} fill={RAIL} />
          <rect x={192 - 3 - 2} y={4} width={2} height={120} fill={RAIL} />
          <rect x={0} y={4} width={192} height={2} fill={RAIL} />
          <rect x={0} y={128 - 4 - 2} width={192} height={2} fill={RAIL} />
          {belties}
          {asms}
          <path
            d={rails.join(' ')}
            stroke={RAIL}
            stroke-width={2}
            fill={'transparent'}
          />
          {stops}
          {icons}
        </g>
      </svg>
    );
  }
}

// function twoThirds(count: number, [w, h]: Dim, [sx, sy]: Dim, maxH: number): Pos[] {
//   const out: Pos[] = [];
//   const totalL = count * (h + sy);
//   let fullCols = Math.floor(totalL / maxH);
//   const rem = totalL - fullCols * maxH;
//   let [cx, cy] = [0, 0];
//   while (fullCols > 2) {
//     out.push([cx, cy]);
//     cy += h + sy;
//     fullCols--;
//   }
// }

interface DistrictRet {
  asms: Pos[];
  belts: Path[];
  bound: Dim;
}

interface AsmSizeV {
  w: number;
  h: number;
  sxo: number;
  sxi: number;
  sy: number;
}

function oneTwo(count: number, size: AsmSizeV, maxH: number): DistrictRet {
  const { w, h, sxo, sxi, sy } = size;

  const totalL = count * (h + sy);
  if (totalL <= (maxH * 2) / 3) {
    return oneLine(count, size);
  }
  const biW = sxo + w + sxi + w + sxo;

  const ret: DistrictRet = {
    asms: [],
    belts: [],
    bound: [0, 0],
  };

  let [cx, cy] = [0, 0];
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      ret.asms.push([cx + sxi, cy]);
    } else {
      ret.asms.push([cx + sxi + w + sxo, cy]);
      cy += h + sy;
    }
    if (cy >= maxH) {
      for (let j = 0; j < sxi - 1; ++j) {
        let x = cx + j + 1;
        ret.belts.push([
          [x, 0],
          [x, cy],
        ]);
        x = cx + sxi + j + w + sxo + w + 1;
        ret.belts.push([
          [x, 0],
          [x, cy],
        ]);
      }
      for (let j = 0; j < sxo - 1; ++j) {
        const x = cx + sxi + w + j + 1;
        ret.belts.push([
          [x, 0],
          [x, cy],
        ]);
      }
      cx += biW + 2;
      cy = 0;
    }
  }

  for (let i = 0; i < sxi - 1; ++i) {
    let x = cx + i + 1;
    ret.belts.push([
      [x, 0],
      [x, cy],
    ]);
    x = cx + sxi + i + w + sxo + w + 1;
    ret.belts.push([
      [x, 0],
      [x, cy],
    ]);
  }

  for (let i = 0; i < sxo - 1; ++i) {
    const x = cx + sxi + w + i + 1;
    ret.belts.push([
      [x, 0],
      [x, cy],
    ]);
  }

  ret.bound = [cx + biW, maxH];

  return ret;
}

function oneLine(count: number, size: AsmSizeV): DistrictRet {
  const { w, h, sxo, sxi, sy } = size;
  const ret: DistrictRet = {
    asms: [],
    belts: [],
    bound: [0, 0],
  };
  let [cx, cy] = [0, 0];
  for (let i = 0; i < count; i++) {
    ret.asms.push([cx + sxi, cy]);
    cy += h + sy;
  }
  for (let i = 0; i < sxi - 1; ++i) {
    const x = cx + i;
    ret.belts.push([
      [x, 0],
      [x, cy],
    ]);
  }
  for (let i = 0; i < sxo - 1; ++i) {
    const x = cx + i + w + sxi + 1;
    ret.belts.push([
      [x, 0],
      [x, cy],
    ]);
  }
  ret.bound = [cx + sxi + w + sxo, cy];
  return ret;
}
