#!/usr/bin/env -S npx babel-node -x .ts,.tsx

import { initOnNode, loadTrainFlows } from './data-hack-for-node';
import { data, Pulse } from '../web/datae';
import { Colon } from '../web/muffler/colon';
import { writeFileSync } from 'fs';
import { sortByKeys } from '../web/muffler/deter';

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

  for (const flow of Object.values(byColon)) {
    flow.sort((a, b) => a[2] - b[2]);
  }

  writeFileSync(
    __dirname + '/../data/trainPulses.json',
    JSON.stringify({ byColon: sortByKeys(byColon) }),
  );
}

main();
