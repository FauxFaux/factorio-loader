#!/usr/bin/env -S npx babel-node -x .ts
import * as fs from 'fs';

const base = process.argv[2];

const [ox, oy] = [-14, -47];
const [w, h] = [192, 128];

type Coord = readonly [number, number];
type BlockId = Coord;

function distSq(a: Coord, b: Coord) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

type Signal = [string, string, number];

export type BlockContent = {
  tags: string[];
  asm: Record<string, number>;
  stop: { name: string; settings: Signal[]; items: Signal[] }[];
};

function main() {
  const byBlock: Record<string, BlockContent> = {};
  const getBlock = (id: BlockId) => {
    const sid = String(id);
    if (!byBlock[sid]) {
      byBlock[sid] = {
        tags: [],
        asm: {},
        stop: [],
      };
    }
    return byBlock[sid];
  };

  for (const obj of load('tags')) {
    const block = getBlock(obj.block);
    block.tags.push(obj.name);
  }

  for (const obj of load('assembling-machine')) {
    const block = getBlock(obj.block);
    const label = `${obj.name} making ${obj.ext[0]}`;
    if (!block.asm[label]) {
      block.asm[label] = 0;
    }
    block.asm[label]++;
  }

  const stopNames: [Coord, string][] = [];
  for (const obj of load('train-stop')) {
    if (obj.name !== 'logistic-train-stop') continue;
    stopNames.push([obj.pos, obj.ext[0]]);
  }

  function nearbyStationName(pos: Coord): string {
    for (const [stopLoc, stopName] of stopNames) {
      const d = distSq(pos, stopLoc);
      if (d < 1) {
        return stopName;
      }
    }
    throw new Error(`unable to find name for ${pos}`);
  }

  for (const obj of load('train-stop-input')) {
    const block = getBlock(obj.block);
    const name = nearbyStationName(obj.pos);
    const splitPoint = obj.ext.indexOf('red');
    const red = obj.ext.slice(1, splitPoint);
    const green = obj.ext.slice(splitPoint + 1);
    block.stop.push({
      name,
      settings: signals(red),
      items: signals(green),
    });
  }

  console.log(JSON.stringify(byBlock));
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
  const content = fs.readFileSync(`${base}/${kind}.rec`, { encoding: 'utf-8' });
  for (const line of content
    .split('\x1d') // (\035)
    .map((record) => record.split('\x1e'))) {
    // (\036)
    const [x, y, dir, name, ...ext] = line;
    const pos = [parseFloat(x), parseFloat(y)] as const;
    const block = toBlock(pos);
    items.push({ block, name, ext, pos });
  }
  return items;
}

function toBlock([x, y]: readonly [number, number]) {
  x -= ox;
  y -= oy;
  const by = Math.floor(y / h);
  if (Math.abs(by) % 2 == 1) {
    x -= w / 2;
  }
  const bx = Math.floor(x / w);

  return [bx, by] as const;
}

main();