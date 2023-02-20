#!/usr/bin/env -S npx babel-node -x .ts,.tsx

// <~/ins/factorio/script-output/ltn-export-log.serpent lua2json > data/2023-02-15-train-flows.jsonl

import { initOnNode } from './data-hack-for-node';
import * as fs from 'fs';
import { data } from '../web';

initOnNode();

const raw = fs
  .readFileSync(require.resolve('../data/2023-02-15-train-flows.jsonl'), {
    encoding: 'utf8',
  })
  .split('\n')
  .filter((line) => line.length > 0)
  .map((line) => JSON.parse(line))
  .filter((line) => line.type === 'history')
  .map((line) => ({
    from: line.from_id as number,
    to: line.to_id as number,
    runtime: line.runtime as number,
    finished: line.finished as number,
    shipment: line.shipment as Record<string, number>,
  }));

function main() {
  console.log('digraph {rankdir="LR";');

  const stopLookup: Record<number, string> = {};
  for (const [loc, obj] of Object.entries(data.doc)) {
    for (const stop of obj.stop) {
      stopLookup[stop.stopId] = loc;
    }
  }

  const routes: Record<string, Record<string, number>> = {};

  for (const flow of raw) {
    const key = `${stopLookup[flow.from]}|${stopLookup[flow.to]}`;
    if (!routes[key]) routes[key] = {};
    for (const [item, count] of Object.entries(flow.shipment)) {
      if (
        item !== 'item,coke' &&
        item !== 'item,acetylene-barrel' &&
        item !== 'item,ammonia-barrel' &&
        item !== 'item,flue-gas-barrel' &&
        item !== 'item,syngas-barrel'
      )
        continue;
      routes[key][item] = (routes[key][item] || 0) + count;
    }
  }

  for (const [key, shipment] of Object.entries(routes)) {
    if (0 === Object.keys(shipment).length) continue;
    let [from, to] = key.split('|');
    from += ' (' + data.doc[from].tags.join(', ').replace(/["[\]]/g, '') + ')';
    to += ' (' + data.doc[to].tags.join(', ').replace(/["[\]]/g, '') + ')';
    const total = Object.values(shipment).reduce((a, b) => a + b, 0);
    const items = Object.entries(shipment)
      .map(([item, count]) => `${item.replace(/.*,/, '')}*${count}`)
      .join(', ');
    console.log(
      `"${from}" -> "${to}" [label="${items}",penwidth=${total / 10000}]`,
    );
  }

  console.log('}');
}

main();
