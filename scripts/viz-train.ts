#!/usr/bin/env -S npx babel-node -x .ts,.tsx

// <~/ins/factorio/script-output/ltn-export-log.serpent lua2json > data/2023-02-15-train-flows.jsonl

import { initOnNode } from './data-hack-for-node';
import * as fs from 'fs';
import { mkdirSync, renameSync, rmSync } from 'fs';
import { data } from '../web';
import { execSync } from 'child_process';

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

const stopLookup: Record<number, string> = {};
for (const [loc, obj] of Object.entries(data.doc)) {
  for (const stop of obj.stop) {
    stopLookup[stop.stopId] = loc;
  }
}

const imgDir = 'data/flow-svgs';

function main() {
  rmSync(imgDir, { force: true, recursive: true });
  mkdirSync(imgDir);
  const items = new Set<string>();
  for (const flow of raw) {
    for (const item of Object.keys(flow.shipment)) {
      items.add(item);
    }
  }
  items.delete('item,empty-barrel');
  for (const item of items) {
    oneItem(item);
  }
  fs.writeFileSync(
    'data/flowDiagrams.json',
    JSON.stringify([...items].map((item) => item.replace(',', ':')).sort()),
  );
}

function oneItem(target: string) {
  let dot = '';
  dot += 'digraph {rankdir="LR";';

  const routes: Record<string, Record<string, number>> = {};

  for (const flow of raw) {
    const key = `${stopLookup[flow.from]}|${stopLookup[flow.to]}`;
    if (!routes[key]) routes[key] = {};
    for (const [item, count] of Object.entries(flow.shipment)) {
      if (item !== target) continue;
      routes[key][item] = (routes[key][item] || 0) + count;
    }
  }

  const mean =
    Object.values(routes)
      .map((route) => Object.values(route).reduce((a, b) => a + b, 0))
      .reduce((a, b) => a + b, 0) /
    Object.values(routes).filter((route) => Object.keys(route).length !== 0)
      .length;

  for (const [key, shipment] of Object.entries(routes)) {
    if (0 === Object.keys(shipment).length) continue;
    let [from, to] = key.split('|');
    from += ' (' + data.doc[from].tags.join(', ').replace(/["[\]]/g, '') + ')';
    to += ' (' + data.doc[to].tags.join(', ').replace(/["[\]]/g, '') + ')';
    const total = Object.values(shipment).reduce((a, b) => a + b, 0);
    const items = Object.entries(shipment)
      .map(([item, count]) => `${item.replace(/.*,/, '')}*${count}`)
      .join(', ');
    dot += `"${from}" -> "${to}" [label="${items}",penwidth=${total / mean}]`;
  }

  dot += '}';

  fs.writeFileSync('temp.dot', dot);

  console.log(`rendering ${target}...`);
  execSync('circo -Tsvg temp.dot > temp.svg', { stdio: 'inherit' });
  renameSync('temp.svg', `${imgDir}/${target.replace(',', '-')}.svg`);
}

main();
