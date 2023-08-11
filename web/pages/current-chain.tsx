import type { JSX } from 'preact';
import minBy from 'lodash/minBy';
import { useQuery } from 'preact-fetching';
import { Component } from 'preact';

import { Colon, fromColon, splitColon } from '../muffler/colon';
import { BlockLine, ColonJoined } from '../objects';
import { buildMaking, makeUpRecipe } from '../muffler/walk-recipes';
import { Coord, data } from '../datae';
import { TempRange } from '../components/how-to-make';
import { GpsLink } from '../lists';
import { BRICK_H, BRICK_W, toBlock } from '../../scripts/magic';
import { humanise } from '../muffler/human';
import { cacheableNow, KNOWN_STATUS, STATUS_FILLS } from './craftings';

function minDist(a: Coord[], b: Coord[]) {
  return Math.min(
    ...a.flatMap(([ax, ay]) =>
      b.map(([bx, by]) => Math.abs(ax - bx) + Math.abs(ay - by)),
    ),
  );
}

export class CurrentChain extends Component<{ colon: Colon }> {
  render(props: { colon: Colon }) {
    const waysToMake = buildMaking();
    const recipes = waysToMake[props.colon];
    if (!recipes) return <div>no recipes</div>;
    const locsByRecipe = countRecipeUsers();

    const wayPointData: [number, number, string][] = [
      [0, 0, 'spawn point'],
      [-129, -393, 'starter base request'],
      [-406, -677, 'pyscience'],
      [-15, 1166, 'sailing lake'],
      [199, 159, "Sauron's zoo"],
      [80, 589, 'belt bus bottom'],
      [-175, 423, 'the troubled bridge'],
      [-297, -493, 'shopping centre (fusion)'],
      [-105, -493, 'shopping centre (high tech)'],
      [279, -493, 'shopping centre (alien life)'],
    ];

    const inBus = (colon: Colon) => {
      const [kind, item] = splitColon(colon);
      switch (kind) {
        case 'item':
          return data.doc['0,0'].items[item];
        case 'fluid':
          return data.doc['0,0'].fluids[item];
        default:
          return undefined;
      }
    };

    const now = cacheableNow();

    const wayPoints = [...wayPointData];

    const maybeAddWaypoints = (locs: Coord[], colon: Colon) => {
      if (locs.length <= 2) {
        for (const [lx, ly] of locs) {
          const [, item] = fromColon(colon);
          wayPoints.push([lx, ly, `where ${item.localised_name} is made`]);
        }
      }
    };

    const pages: JSX.Element[][] = [];
    const units: number[] = [];

    for (const [using, usingD] of recipes
      .map((r) => [r, locsByRecipe[r]] as const)
      // also removes nulls:
      .filter(([, usingD]) => usingD?.locs?.length > 0)
      .sort(([, a], [, b]) => b.locs.length - a.locs.length)) {
      const page: JSX.Element[] = [];

      units.push(...usingD.units);

      const recp = makeUpRecipe(using)!;
      page.push(
        <li>
          Made using recipe name: {recp.localisedName} (
          <span class={'font-monospace'}>{using}</span>)
        </li>,
      );

      const refs = usingD.locs;
      const locsForColon = (colon: Colon) => {
        const locs: Coord[] = [];
        for (const recipe of waysToMake[colon] ?? []) {
          locs.push(...(locsByRecipe[recipe]?.locs ?? []));
        }
        return locs;
      };

      const unitsForColon = (colon: Colon) => {
        const units: number[] = [];
        for (const recipe of waysToMake[colon] ?? []) {
          units.push(...(locsByRecipe[recipe]?.units ?? []));
        }
        return units;
      };

      page.push(pickLocation(usingD, wayPoints, recp.localisedName, now));
      maybeAddWaypoints(usingD.locs, props.colon);

      for (const ing of recp.ingredients().sort(
        (a, b) =>
          // minDist(locsForColon(a.colon), refs) -
          // minDist(locsForColon(b.colon), refs),
          (inBus(a.colon) ?? 0) / a.amount - (inBus(b.colon) ?? 0) / b.amount,
      )) {
        const locs = locsForColon(ing.colon).sort(
          (a, b) => minDist([a], refs) - minDist([b], refs),
        );
        for (const u of unitsForColon(ing.colon).slice(0, 100)) {
          if (!units.includes(u)) {
            if (!Number.isFinite(u)) {
              // furnaces have undefined unit numbers in some cases apparently
              continue;
            }
            units.push(u);
          }
        }
        const busHas = inBus(ing.colon) ?? 0;
        const avail = busHas / ing.amount;
        page.push(
          <li>
            <a
              href={`/an/current-chain/${ing.colon}`}
              title="focus in on this item"
              style="text-decoration: none; color: inherit; font-size: 75%; vertical-align: middle"
            >
              🎯
            </a>{' '}
            <ColonJoined colon={ing.colon} />
            <TempRange ing={ing} /> (
            <span style={avail > 1 ? 'color: #4f4' : 'color: #f44'}>
              {humanise(busHas)} / {ing.amount}{' '}
              {ing.colon.startsWith('fluid:') ? ' in a tank' : 'stored'}
            </span>{' '}
            in bus)
            {pickLocation(
              { locs, units: unitsForColon(ing.colon) },
              wayPoints,
              fromColon(ing.colon)[1].localised_name,
              now,
            )}
          </li>,
        );

        maybeAddWaypoints(locs, ing.colon);
      }

      pages.push(page);
    }

    return (
      <>
        <div class="row">
          <div class="col">
            <h2>
              <ColonJoined colon={props.colon} />
            </h2>
            <p>
              <a href={`/an/craftings/${units.join(',')}`}>graph</a>
            </p>
            {pages.map((page) => (
              <ul class={'current-chain-ul'}>{page}</ul>
            ))}
          </div>
        </div>
        <div class="row">
          <div class="col">
            <p>
              'stored' means "in a chest somewhere", not necessarily available
              to the logistics network.
            </p>
          </div>
        </div>
      </>
    );
  }
}

function countRecipeUsers() {
  const dataByRecipe: Record<string, { locs: Coord[]; units: number[] }> = {};
  for (const brick of Object.values(data.doc)) {
    for (const [_factory, recipe, _modules, loc, unit] of brick.asms) {
      if (!recipe) continue;
      if (!dataByRecipe[recipe]) dataByRecipe[recipe] = { locs: [], units: [] };
      dataByRecipe[recipe].locs.push(loc);
      dataByRecipe[recipe].units.push(unit);
    }
  }
  return dataByRecipe;
}

const numberToFraction = (num: number) => {
  if (num < 0)
    return num.toFixed(5) + ' negative bricks are a thing apparently';
  if (num < 0.06) return 'just';
  if (num <= 0.13) return '⅛ brick';
  if (num <= 0.27) return '¼ brick';
  if (num <= 0.55) return '½ brick';
  if (num <= 1.1) return '1 brick';
  if (num <= 1.6) return '1½ bricks';
  const s = num.toFixed(0);
  // unreachable, right?!
  if (s === '1') return '1 brick';
  return `${s} bricks`;
};

const compass = (x: number, y: number) => {
  let angle = (Math.atan2(-y, x) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  if (angle < 22.5) return 'E';
  if (angle < 67.5) return 'NE';
  if (angle < 112.5) return 'N';
  if (angle < 157.5) return 'NW';
  if (angle < 202.5) return 'W';
  if (angle < 247.5) return 'SW';
  if (angle < 292.5) return 'S';
  if (angle < 337.5) return 'SE';
  return 'E';
};

interface Last {
  changes: {
    [unit: number]: {
      producedChange: number;
      lastStatus: number;
      lastStatusChange: number;
      previousStatus: number;
    };
  };
}

function pickLocation(
  usingD: { locs: Coord[]; units: number[] },
  wayPoints: [number, number, string][],
  caption: string,
  now: number,
) {
  const { locs, units } = usingD;

  if (locs.length === 0)
    return (
      <ul>
        <li>Production not understood (e.g. furnace, mine, rocket).</li>
      </ul>
    );

  if (locs.length > 20) {
    return (
      <ul>
        <li>Made in way too many locations, see item page for details.</li>
      </ul>
    );
  }

  const url = `https://facto-exporter.goeswhere.com/api/last?units=${units
    .sort()
    .join(',')}&__cachebust=${now}`;
  const {
    // isLoading,
    // isError,
    // error,
    data: fetched,
  } = useQuery(url, async () => {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`fetch failure: ${resp.status}`);
    return (await resp.json()) as Last;
  });

  const change = (unit: number) => {
    const c = fetched?.changes?.[unit];
    if (!c) return null;
    const ts = (v: number | undefined) =>
      v ? new Date(v * 1000).toTimeString().slice(0, 5) : '??';
    const lastProduced = ts(c.producedChange);
    const statusChange = ts(c.lastStatusChange);
    // const status = KNOWN_STATUS[c.lastStatus] ?? '??';
    // const previousStatus = KNOWN_STATUS[c.previousStatus] ?? '??';
    return (
      <p>
        last ran: {lastProduced}, currently: <Status status={c.lastStatus} />{' '}
        since {statusChange}, was <Status status={c.previousStatus} />
      </p>
    );
  };

  return (
    <ul>
      {locs.map(([lx, ly], i) => {
        const unit = units[i];
        const brick = String(toBlock([lx, ly]));
        if (
          !data.meta.isSpawn.includes(brick) &&
          data.doc[brick]?.tags?.length
        ) {
          return (
            <li>
              <GpsLink
                gps={[lx, ly]}
                caption={`${caption} in brick ${data.doc[brick].tags.join(
                  ', ',
                )}`}
              />
              somewhere in <BlockLine block={brick} />
              {change(unit)}
            </li>
          );
        }
        const [mx, my, mname] = minBy(wayPoints, ([x, y]) =>
          Math.hypot(x - lx, y - ly),
        )!;
        const dx = lx - mx;
        const dy = ly - my;
        const dist = Math.hypot(dx / BRICK_W, dy / BRICK_H);
        const desc =
          dist < 3 / 128
            ? `at ${mname}`
            : `${numberToFraction(dist)} ${compass(dx, dy)} of ${mname}`;
        return (
          <li>
            <GpsLink gps={[lx, ly]} caption={`${caption} ${desc}`} />
            {desc}
            {change(unit)}
            {/*{data.cp.byPos[String([lx.toFixed(0),ly.toFixed(0)])]?.runs?.join(',')}*/}
          </li>
        );
      })}
    </ul>
  );
}

export const Status = (props: { status: number }) => {
  const name = KNOWN_STATUS[props.status];
  if (!name) return <>??</>;
  return (
    <span
      style={`border-radius: 2px; padding: 2px; background-color: ${
        STATUS_FILLS[props.status]
      }`}
    >
      {name}
    </span>
  );
};
