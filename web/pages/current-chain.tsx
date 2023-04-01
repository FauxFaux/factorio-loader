import { minBy } from 'lodash';

import { Component } from 'preact';
import { Colon, fromColon } from '../muffler/colon';
import { BlockLine, ColonJoined } from '../objects';
import { buildMaking, RecipeName } from '../muffler/walk-recipes';
import { computed, Coord, data } from '../datae';
import { TempRange } from '../components/how-to-make';
import { GpsLink } from '../lists';
import { BRICK_H, BRICK_W, toBlock } from '../../scripts/magic';

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

    for (const [recipe, data] of Object.entries(locsByRecipe)) {
      if (data.locs.length === 0) delete locsByRecipe[recipe];
    }

    const dataByRecipe: Record<RecipeName, { locs: Coord[]; execs: number }> =
      {};
    for (const recipe of recipes) {
      dataByRecipe[recipe] = {
        locs: locsByRecipe[recipe]?.locs ?? [],
        execs: computed.recipeExecs[recipe] ?? 0,
      };
    }

    const totalUsage = Object.keys(dataByRecipe).reduce(
      (a, name) => a + computed.recipeExecs[name] ?? 0,
      0,
    );

    const [[using, usingD], ...rest] = Object.entries(dataByRecipe).sort(
      ([, a], [, b]) => b.execs - a.execs,
    );

    const page = [];

    const recp = data.recipes.regular[using];
    const percNo = ((usingD.execs / totalUsage) * 100).toFixed(0);
    const perc = totalUsage > 0 ? `(${percNo}%)` : null;
    page.push(
      <li>
        Made using recipe name: {recp.localised_name} (
        <span class={'font-monospace'}>{using}</span>) {perc}
      </li>,
    );

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

    const wayPoints = [...wayPointData];

    const maybeAddWaypoints = (locs: Coord[], colon: Colon) => {
      if (locs.length <= 2) {
        for (const [lx, ly] of locs) {
          const [, item] = fromColon(colon);
          wayPoints.push([lx, ly, `where ${item.localised_name} is made`]);
        }
      }
    };

    const refs = usingD.locs;
    const locsForColon = (colon: Colon) => {
      const locs: Coord[] = [];
      for (const recipe of waysToMake[colon] ?? []) {
        locs.push(...(locsByRecipe[recipe]?.locs ?? []));
      }
      return locs;
    };

    page.push(pickLocation(usingD.locs, wayPoints, recp.localised_name));
    maybeAddWaypoints(usingD.locs, props.colon);

    for (const ing of recp.ingredients.sort(
      (a, b) =>
        minDist(locsForColon(a.colon), refs) -
        minDist(locsForColon(b.colon), refs),
    )) {
      const locs = locsForColon(ing.colon).sort(
        (a, b) => minDist([a], refs) - minDist([b], refs),
      );
      page.push(
        <li>
          <ColonJoined colon={ing.colon} />
          <TempRange ing={ing} />
          {pickLocation(locs, wayPoints, ing.colon)}
        </li>,
      );

      maybeAddWaypoints(locs, ing.colon);
    }

    return (
      <div class="row">
        <div class="col">
          <h2>
            <ColonJoined colon={props.colon} />
          </h2>
          <ul class={'current-chain-ul'}>{page}</ul>
        </div>
      </div>
    );
  }
}

function countRecipeUsers() {
  const dataByRecipe: Record<string, { locs: Coord[] }> = {};
  for (const brick of Object.values(data.doc)) {
    for (const [label, { locations }] of Object.entries(brick.asm)) {
      const recipe = label.split('\0')[1];
      if (!dataByRecipe[recipe]) dataByRecipe[recipe] = { locs: [] };
      dataByRecipe[recipe].locs.push(...locations);
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

function pickLocation(
  locs: Coord[],
  wayPoints: [number, number, string][],
  caption: string,
) {
  if (locs.length > 4) {
    return (
      <ul>
        <li>Made in many locations, see item page for details.</li>
      </ul>
    );
  }

  return (
    <ul>
      {locs.map(([lx, ly]) => {
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
          </li>
        );
      })}
    </ul>
  );
}
