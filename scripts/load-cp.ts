#!/usr/bin/env -S npx babel-node -x .ts,.tsx
import fs from 'fs';

import { loadSamples } from './loaders';
import { initOnNode } from './data-hack-for-node';
import { data } from '../web/datae';
import type { JRecipe } from '../web/objects';
import type { Colon } from '../web/muffler/colon';
import { removeOffset } from './magic';

initOnNode();

// concatenated positions; i.e. `${x},${y}`
type ConcPos = string;

// a brick is 192x128, 192/32 = 6, 128/32 = 4.
// we don't need to manage row/column offsets here, as those numbers are divisible by 2.
const GRID = 32;

function main() {
  const allKeys = new Set<string>();

  type LocCount = number[];
  const byColon: Record<Colon, { produced: LocCount; consumed: LocCount }[]> =
    {};

  const justTicks: number[] = [];

  const previousTick: Record<ConcPos, number> = {};

  const totalObservations = loadSamples('assemblers');
  for (let i = 0; i < totalObservations.length; i++) {
    const wholeTick = totalObservations[i];
    if (wholeTick.length === 0) continue;
    const tickMachines = wholeTick.split('\x1d');
    const tickNo = tickMachines[0];
    justTicks.push(parseInt(tickNo));
    console.log('tick', tickNo, i, '/', totalObservations.length);

    const produced: Record<Colon, Record<ConcPos, number>> = {};
    const consumed: Record<Colon, Record<ConcPos, number>> = {};

    for (const machineLine of tickMachines.slice(1)) {
      const machine = machineLine.split('\x1e');

      const rx = parseFloat(machine[0]);
      const ry = parseFloat(machine[1]);

      const [x, y] = removeOffset([rx, ry]);
      const gx = Math.floor(x / GRID);
      const gy = Math.floor(y / GRID);

      // if (x !== -452.5 || y !== 438.5) continue;

      const counter = parseInt(machine[2]);

      // skipping legacy format line ([id, counter, recipe|null]).
      if (!Number.isFinite(counter)) continue;

      const concPos = `${x},${y}`;
      const last = previousTick[concPos];
      previousTick[concPos] = counter;
      if (undefined === last || counter === last) continue;
      const runs = counter - last;

      const recipeName = machine[3];
      if (!recipeName) continue;

      let recipe = makeUpRecipe(recipeName);
      if (!recipe) continue;

      const concGrid = `${gx},${gy}`;

      for (const ing of recipe?.ingredients ?? []) {
        if (!consumed[ing.colon]) consumed[ing.colon] = {};
        if (!consumed[ing.colon][concGrid]) consumed[ing.colon][concGrid] = 0;
        consumed[ing.colon][concGrid] += runs * ing.amount;
      }

      for (const prod of recipe?.products ?? []) {
        const prob = prod.probability ?? 1;
        let mid: number;
        if ('amount' in prod) {
          mid = prod.amount;
        } else {
          mid = (prod.amount_max + prod.amount_min) / 2;
        }
        mid *= prob;

        if (!produced[prod.colon]) produced[prod.colon] = {};
        if (!produced[prod.colon][concGrid]) produced[prod.colon][concGrid] = 0;
        produced[prod.colon][concGrid] += runs * mid;
      }
    }

    for (const key of Object.keys(consumed)) {
      allKeys.add(key);
    }
    for (const key of Object.keys(produced)) {
      allKeys.add(key);
    }

    for (const colon of allKeys) {
      if (!byColon[colon]) byColon[colon] = [];
      byColon[colon].push({
        produced: listificate(produced[colon]),
        consumed: listificate(consumed[colon]),
      });
    }
  }

  fs.rmSync('data/cp', { recursive: true, force: true });
  fs.mkdirSync('data/cp', { recursive: true });

  fs.writeFileSync(
    'data/cp/meta.json',
    JSON.stringify({ ticks: justTicks, available: [...allKeys].sort() }),
  );
  for (const [colon, data] of Object.entries(byColon)) {
    fs.writeFileSync(
      `data/cp/${colon.replace(':', '-')}.json`,
      JSON.stringify(data),
    );
  }

  // writeFileSync(
  //   'cp.json',
  //   JSON.stringify({
  //     byColon,
  //     justTicks,
  //   }),
  // );
}

function fillBarrel(fluidName: string) {
  return {
    ingredients: [
      {
        colon: 'item:empty-barrel',
        amount: 1,
      },
      {
        colon: `fluid:${fluidName}`,
        amount: 50,
      },
    ],
    products: [
      {
        // TODO: gross approximation
        colon: `item:${fluidName}-barrel`,
        amount: 1,
      },
    ],
  };
}

function makeUpRecipe(
  recipeName: string,
): Pick<JRecipe, 'ingredients' | 'products'> | undefined {
  const regular = data.recipes.regular[recipeName];
  if (regular) return regular;

  let ma = recipeName.match(/^fill-(.*)-barrel$/);
  if (ma) {
    return fillBarrel(ma[1]);
  }

  // ma = recipeName.match(/^empty-(.*)-barrel$/);
  ma = recipeName.match(/^(.*)-pyvoid$/);
  if (ma) {
    return {
      ingredients: [
        {
          colon: `item:${ma[1]}`,
          amount: 1,
        },
      ],
      products: [
        {
          colon: `item:ash`,
          amount: 1,
          probability: 0.2,
        },
      ],
    };
  }

  ma = recipeName.match(/^(.*)-pyvoid(?:-fluid|-gas)?$/);
  if (ma) {
    return {
      ingredients: [
        {
          colon: `fluid:${ma[1]}`,
          amount: 20_000,
        },
      ],
      products: [],
    };
  }

  console.log('unknown recipe', recipeName);
}

/** pack { "5,3": 7, "6,3": 8 } into [5, 3, 7, 6, 3, 8] */
function listificate(locCount: Record<ConcPos, number>): number[] {
  if (!locCount) return [];
  const ret: number[] = [];
  for (const [key, value] of Object.entries(locCount)) {
    const [x, y] = key.split(',').map((x) => parseInt(x));
    ret.push(x, y, Math.round(value * 100) / 100);
  }
  return ret;
}

main();
