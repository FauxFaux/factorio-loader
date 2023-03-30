#!/usr/bin/env -S npx babel-node -x .ts,.tsx
import fs from 'fs';

import { loadRec, loadSamples } from './loaders';
import { sortByKeys } from '../web/muffler/deter';
import type { ConcPos, data } from '../web/datae';

function main() {
  const justTicks: number[] = [];

  const previousTick: Record<ConcPos, number> = {};
  const runList: Record<ConcPos, number[]> = {};

  const totalObservations = loadSamples('assemblers');
  for (let i = 0; i < totalObservations.length; i++) {
    const wholeTick = totalObservations[i];
    if (wholeTick.length === 0) continue;
    const tickMachines = wholeTick.split('\x1d');
    const tickNo = tickMachines[0];
    justTicks.push(parseInt(tickNo));
    console.log('tick', tickNo, i, '/', totalObservations.length);

    for (const machineLine of tickMachines.slice(1)) {
      const machine = machineLine.split('\x1e');

      const x = parseFloat(machine[0]);
      const y = parseFloat(machine[1]);
      const counter = parseInt(machine[2]);

      const concPos = `${x},${y}`;
      const last = previousTick[concPos];
      previousTick[concPos] = counter;
      if (undefined === last) continue;
      const runs = counter - last;

      if (!(concPos in runList)) runList[concPos] = [];
      runList[concPos].push(runs);
    }
  }

  const expected = Object.values(runList)[0].length;
  for (const [concPos, runs] of Object.entries(runList)) {
    if (runs.length !== expected) {
      console.log('skipping partially filled', concPos, runs.length, expected);
      delete runList[concPos];
    }

    if (runs.every((r) => r === 0)) {
      // console.log('skipping all null', concPos, runs.length, expected);
      delete runList[concPos];
    }
  }

  const byPos: (typeof data)['cp']['byPos'] = Object.fromEntries(
    Object.entries(sortByKeys(runList)).map(([concPos, runs]) => [
      concPos,
      { runs, name: '' },
    ]),
  );

  for (const item of loadRec('assembling-machine')) {
    const pos = String(item.pos);
    if (!(pos in byPos)) byPos[pos] = {};
    byPos[pos].name = item.name;
    const recipe = item.ext[0];
    if (recipe) byPos[pos].recipe = recipe;
  }

  const obj: (typeof data)['cp'] = {
    ticks: justTicks,
    byPos,
  };

  fs.writeFileSync('data/cp.json', JSON.stringify(obj));
}
main();
