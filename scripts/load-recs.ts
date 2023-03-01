#!/usr/bin/env -S npx babel-node -x .ts,.tsx
import * as fs from 'fs';
import * as yaml from 'js-yaml';

import { toBlock } from './magic';
import { initOnNode, loadTrainFlows } from './data-hack-for-node';
import { data } from '../web';
import {
  isProvideStation,
  provideStationPurpose,
} from '../web/muffler/stations';
import { Colon, tupleToColon } from '../web/muffler/colon';

const base = process.argv[2];

initOnNode(['doc', 'technologies', 'prodStats']);

type Coord = readonly [number, number];
type BlockId = Coord;

function distSq(a: Coord, b: Coord) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/** type, name, count
 * e.g. "item", "empty-barrel", -9000
 */
type Signal = [string, string, number];

export type Stop = {
  /** the in-game, encoded name of the station */
  name: string;
  /** save-persistent number of the stop */
  stopId: number;
  /** signals on the 'settings' wire, typically ltn configuration like stack size */
  settings: Signal[];
  /** signals on the 'items' wire, positive for provide, negative for *outstanding* requests */
  items: Signal[];
  /** information *from the name* about what this station provides */
  // type, name
  provides: [string, string][];
  /** information from nearby combinators about what this station may be requesting */
  combinator: Signal[];

  gps: readonly [number, number];

  /** the amount of stuff leaving and arriving at this stop */
  flowFrom: Record<Colon, number>;
  flowTo: Record<Colon, number>;
};

export type BlockContent = {
  tags: string[];
  asm: Record<string, number>;
  stop: Stop[];
  items: Record<string, number>;
  fluids: Record<string, number>;
  boilers: number;
};

interface Patch {
  name: Record<string, string>;
  merge: Record<string, string[]>;
}

function main() {
  const patch = yaml.load(
    fs.readFileSync(require.resolve('../patch.yaml'), 'utf8'),
  ) as Patch;
  const remappings = Object.fromEntries(
    Object.entries(patch.merge).flatMap(([dest, srcs]) =>
      srcs.map((src) => [src, dest] as const),
    ),
  );

  const byBlock: Record<string, BlockContent> = {};
  const getBlock = (id: BlockId | string) => {
    let sid = String(id);
    if (remappings[sid]) {
      sid = remappings[sid];
    }
    if (!byBlock[sid]) {
      byBlock[sid] = {
        tags: [],
        asm: {},
        stop: [],
        items: {},
        fluids: {},
        boilers: 0,
      };
    }
    return byBlock[sid];
  };

  for (const obj of load('tags')) {
    const block = getBlock(obj.block);
    block.tags.push(obj.name);
  }

  for (const [id, name] of Object.entries(patch.name)) {
    getBlock(id).tags = [name];
  }

  for (const obj of load('assembling-machine')) {
    const block = getBlock(obj.block);
    const label = `${obj.name}\0${obj.ext[0]}`;
    if (!block.asm[label]) {
      block.asm[label] = 0;
    }
    block.asm[label]++;
  }

  // close enough, eh
  for (const obj of load('furnace')) {
    const block = getBlock(obj.block);
    const label = `${obj.name}\0${obj.ext[0]}`;
    if (!block.asm[label]) {
      block.asm[label] = 0;
    }
    block.asm[label]++;
  }

  for (const obj of load('boiler')) {
    const block = getBlock(obj.block);
    block.boilers += 1;
  }

  const stopNames: [Coord, string, number][] = [];
  for (const obj of load('train-stop')) {
    if (obj.name !== 'logistic-train-stop') continue;
    stopNames.push([obj.pos, obj.ext[0], parseInt(obj.ext[1])]);
  }

  function nearbyStation(pos: Coord, maxDist: number): [Coord, string, number] {
    for (const [stopLoc, stopName, stopId] of stopNames) {
      const d = distSq(pos, stopLoc);
      if (d < maxDist) {
        return [stopLoc, stopName, stopId];
      }
    }
    throw new Error(`unable to find name for ${pos}`);
  }

  const stopCombinator: Record<string, string[]> = {};

  for (const obj of load('constant-combinator')) {
    if (obj.name !== 'constant-combinator') continue;
    let stop;
    try {
      stop = nearbyStation(obj.pos, 3);
    } catch {
      continue;
    }

    const loc = String(stop[0]);

    if (!stopCombinator[loc]) stopCombinator[loc] = [];
    stopCombinator[loc].push(...obj.ext);
  }

  const flowFrom: Record<number, Record<string, number>> = {};
  const flowTo: Record<number, Record<string, number>> = {};

  for (const flow of loadTrainFlows()) {
    if (!flowFrom[flow.from]) flowFrom[flow.from] = {};
    const f = flowFrom[flow.from];
    if (!flowTo[flow.to]) flowTo[flow.to] = {};
    const t = flowTo[flow.to];

    for (const [name, count] of Object.entries(flow.shipment)) {
      const colon = name.replace(',', ':');
      if (!f[colon]) f[colon] = 0;
      f[colon] += count;

      if (!t[colon]) t[colon] = 0;
      t[colon] += count;
    }
  }

  for (const obj of load('train-stop-input')) {
    const block = getBlock(obj.block);
    const [stopLoc, name, stopId] = nearbyStation(obj.pos, 1);
    const splitPoint = obj.ext.indexOf('red');
    const red = obj.ext.slice(1, splitPoint);
    const green = obj.ext.slice(splitPoint + 1);
    const comb = stopCombinator[String(stopLoc)];
    block.stop.push({
      name,
      stopId,
      flowFrom: flowFrom[stopId] || {},
      flowTo: flowTo[stopId] || {},
      settings: signals(red),
      items: signals(green),
      gps: obj.pos,
      provides: isProvideStation(name)
        ? [...provideStationPurpose(name)].map((v) => ['item', v])
        : [],
      combinator: comb ? signals(comb) : [],
    });
  }

  function addItems(items: Record<string, number>, obj: { ext: string[] }) {
    for (let i = 0; i < obj.ext.length; i += 2) {
      const itemName = obj.ext[i];
      const itemCount = parseInt(obj.ext[i + 1]);
      if (!items[itemName]) items[itemName] = 0;
      items[itemName] += itemCount;
    }
  }

  for (const obj of load('container')) {
    const block = getBlock(obj.block);
    addItems(block.items, obj);
  }

  for (const obj of load('logistic-container')) {
    const block = getBlock(obj.block);
    addItems(block.items, obj);
  }

  for (const obj of load('storage-tank')) {
    const block = getBlock(obj.block);
    addItems(block.fluids, obj);
  }

  const technologies: (typeof data)['technologies'] = {};
  for (const tech of loadCells('technologies')) {
    const [name, researchedS, preCntS, ...rest] = tech;
    const researched = researchedS === '1';
    const preCnt = parseInt(preCntS);
    const requires = rest.slice(0, preCnt).sort();
    const unlocks = rest.slice(preCnt).sort();
    technologies[name] = {
      researched,
      requires,
      unlocks,
    };
  }

  fs.writeFileSync(
    'data/technologies.json',
    JSON.stringify(sortByKeys(technologies)),
    { encoding: 'utf-8' },
  );

  const prodStats: (typeof data)['prodStats'] = {};
  for (const type of ['item', 'fluid'] as const) {
    for (const direction of ['input', 'output'] as const) {
      for (const line of loadCells(`${type}-${direction}`)) {
        const [name, totalS, ...extS] = line;
        const colon = tupleToColon([type, name]);
        if (!prodStats[colon]) prodStats[colon] = {};
        const total = parseInt(totalS);
        const perTime = extS.map((v) => parseFloat(v));
        prodStats[colon][direction] = { total, perTime };
      }
    }
  }

  for (const flow of Object.values(flowFrom)) {
    for (const [name, count] of Object.entries(flow)) {
      if (!prodStats[name]) prodStats[name] = { ltn: 0 };
      const p = prodStats[name];
      if (!p.ltn) p.ltn = 0;
      p.ltn += count;
    }
  }

  fs.writeFileSync(
    'data/prodStats.json',
    JSON.stringify(sortByKeys(prodStats)),
    {
      encoding: 'utf-8',
    },
  );

  fs.writeFileSync('data/doc.json', JSON.stringify(byBlock), {
    encoding: 'utf-8',
  });
}

function signals(arr: string[]): [string, string, number][] {
  const res: [string, string, number][] = [];
  for (let i = 0; i < arr.length; i += 3) {
    res.push([arr[i], arr[i + 1], parseFloat(arr[i + 2])]);
  }
  return res;
}

function load(kind: string) {
  const items: { block: BlockId; name: string; ext: string[]; pos: Coord }[] =
    [];
  for (const line of loadCells(kind)) {
    // (\036)
    const [x, y, _dir, name, ...ext] = line;
    const pos = [parseFloat(x), parseFloat(y)] as const;
    if (!Number.isFinite(pos[0]) || !Number.isFinite(pos[1]))
      throw new Error(`invalid x/y: ${x}/${y}`);
    const block = toBlock(pos);
    items.push({ block, name, ext, pos });
  }
  return items;
}

function loadCells(kind: string): string[][] {
  return loadLines(kind).map((record) => record.split('\x1e'));
}

function loadLines(kind: string): string[] {
  return fs
    .readFileSync(`${base}/${kind}.rec`, { encoding: 'utf-8' })
    .split('\x1d'); // (\035)
}

function sortByKeys<T>(obj: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
  );
}

main();
