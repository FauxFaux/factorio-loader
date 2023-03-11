#!/usr/bin/env -S npx babel-node -x .ts,.tsx
import { writeFileSync } from 'fs';

import { initOnNode, loadTrainFlows } from './data-hack-for-node.js';
import { data, Pulse } from '../web/datae.js';
import { Colon } from '../web/muffler/colon.js';
import { sortByKeys } from '../web/muffler/deter.js';

initOnNode();

const raw = loadTrainFlows();

const stopLookup: Record<number, string> = {};
for (const [loc, obj] of Object.entries(data.doc)) {
  for (const stop of obj.stop) {
    stopLookup[stop.stopId] = loc;
  }
}

function main() {
  const earliestStart = raw
    .map((flow) => flow.finished - flow.runtime)
    .reduce((a, b) => Math.min(a, b));

  const byColon: Record<Colon, Pulse[]> = {};
  for (const flow of raw) {
    for (const [item, amount] of Object.entries(flow.shipment)) {
      const colon = item.replace(',', ':');
      if (['item:empty-barrel'].includes(colon)) continue;
      byColon[colon] = byColon[colon] ?? [];
      const start = flow.finished - flow.runtime - earliestStart;
      byColon[colon].push([
        stopLookup[flow.from],
        stopLookup[flow.to],
        start,
        flow.runtime,
        amount,
      ]);
    }
  }
  delete byColon['item:empty-barrel'];

  for (const flow of Object.values(byColon)) {
    flow.sort((a, b) => a[2] - b[2]);
  }

  writeFileSync(
    __dirname + '/../data/train-pulses.json',
    JSON.stringify({ byColon: sortByKeys(byColon) }),
  );
}

main();
