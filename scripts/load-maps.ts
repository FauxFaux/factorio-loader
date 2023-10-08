#!/usr/bin/env -S npx babel-node -x .ts,.tsx

import fs from 'fs';
import _ from 'lodash';

import type { MapRef } from '../web/datae';
import { loadLines } from './loaders';

function main() {
  const maps: MapRef[] = [];
  for (const base of fs.readdirSync('.').filter((d) => d.startsWith('so-'))) {
    const ma = /so-(\d+-\d+-\d+)/.exec(base);
    if (!ma) {
      throw new Error(`bad base: ${base}`);
    }
    const [_, date] = ma;
    const [
      tickS,
      _ticksPlayed,
      _ticksToRun,
      speedS,
      researchProgressS,
      trainsS,
      researchName,
    ] = loadLines('meta', base);

    const [tick, speed, researchProgress, trains] = [
      tickS,
      speedS,
      researchProgressS,
      trainsS,
    ].map((s) => parseFloat(s));

    const hasMap = fs.existsSync(`${base}/out`);

    maps.push({
      date,
      tick,
      speed,
      trains,
      researchName,
      researchProgress,
      hasMap,
    });
  }

  _.sortBy(maps, ['date', 'tick']);

  fs.writeFileSync('data/maps.json', JSON.stringify({ maps }), {
    encoding: 'utf-8',
  });
}

main();
