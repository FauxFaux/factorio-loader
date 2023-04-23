#!/usr/bin/env -S npx babel-node -x .ts,.tsx
import fs from 'fs';

import { loadSamples } from './loaders';

// tick, x,y, speed, dest x, dest y
export type Ping = [number, number, number, number, number, number];

function main() {
  const byTrain: Record<number, Ping[]> = {};

  const totalObservations = loadSamples('trains');
  for (let i = 0; i < totalObservations.length; i++) {
    const wholeTick = totalObservations[i];
    if (wholeTick.length === 0) continue;
    const tickTrains = wholeTick.split('\x1d');
    const tickNo = parseInt(tickTrains[0]);
    console.log('tick', tickNo, i, '/', totalObservations.length);

    for (const trainLine of tickTrains.slice(1)) {
      const train = trainLine.split('\x1e');

      const id = parseInt(train[0]);

      const tx = parseFloat(train[1]);
      const ty = parseFloat(train[2]);
      const ts = parseFloat(train[3]);

      const dx = parseFloat(train[4]);
      const dy = parseFloat(train[5]);

      if (!byTrain[id]) byTrain[id] = [];
      byTrain[id].push([
        tickNo,
        Math.round(tx),
        Math.round(ty),
        Math.round(ts * 100),
        Math.round(dx),
        Math.round(dy),
      ]);
    }
  }

  fs.mkdirSync('data/cpt', { recursive: true });
  fs.writeFileSync('data/cpt/meta.json', JSON.stringify({ byTrain }));
}

main();
