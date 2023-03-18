#!/usr/bin/env -S npx babel-node -x .ts,.tsx

import { loadSamples } from './loaders';
import { initOnNode } from './data-hack-for-node';
import { data } from '../web/datae';
import type { JRecipe } from '../web/objects';
import type { Colon } from '../web/muffler/colon';
import { removeOffset } from './magic';
import { writeFileSync } from 'fs';

initOnNode();

// concatenated positions; i.e. `${x},${y}`
type ConcPos = string;

// a brick is 192x128, 192/32 = 6, 128/32 = 4.
// we don't need to manage row/column offsets here, as those numbers are divisible by 2.
const GRID = 32;

function main() {
  const ticks = [];

  const previousTick: Record<ConcPos, number> = {};

  const totalObservations = loadSamples('assemblers');
  for (let i = 0; i < totalObservations.length; i++) {
    const wholeTick = totalObservations[i];
    if (wholeTick.length === 0) continue;
    const tickMachines = wholeTick.split('\x1d');
    const tickNo = tickMachines[0];
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
      const g = String([gx, gy]);

      // if (x !== -452.5 || y !== 438.5) continue;

      const counter = parseInt(machine[2]);

      // skipping legacy format line ([id, counter, recipe|null]).
      if (!Number.isFinite(counter)) continue;

      const concPos = `${x},${y}`;
      const last = previousTick[concPos];
      previousTick[concPos] = counter;
      if (undefined === last || counter === last) continue;
      const runs = counter - last;

      const recipeName: string | undefined = machine[3];

      const recipe: JRecipe | undefined = data.recipes.regular[recipeName];

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

    ticks.push({ produced, consumed, tickNo });
  }
  writeFileSync('cp.json', JSON.stringify(ticks));
}

main();
