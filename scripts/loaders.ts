import fs from 'fs';
import { Coord } from '../web/datae';
import { toBlock } from './magic';

export type BlockId = Coord;

const base = process.argv[2];

export function loadCells(kind: string): string[][] {
  return loadLines(kind).map((record) => record.split('\x1e'));
}

export function loadLines(kind: string, base = base): string[] {
  return fs
    .readFileSync(`${base}/${kind}.rec`, { encoding: 'utf-8' })
    .split('\x1d'); // (\035)
}

export function loadSamples(kind: string): string[] {
  return fs
    .readFileSync(`${base}/cp-${kind}.rec`, { encoding: 'utf-8' })
    .split('\x1c'); // (\034)
}

export function loadRec(kind: string) {
  const items: {
    block: BlockId;
    name: string;
    ext: string[];
    pos: Coord;
    unitNumber: number;
  }[] = [];
  for (const line of loadCells(kind)) {
    // (\036)
    const [x, y, _dir, name, unitNumber, ...ext] = line;
    const pos = [parseFloat(x), parseFloat(y)] as const;
    if (!Number.isFinite(pos[0]) || !Number.isFinite(pos[1])) {
      throw new Error(`invalid x/y: ${x}/${y}`);
    }
    const block = toBlock(pos);
    items.push({ block, name, ext, pos, unitNumber: parseInt(unitNumber) });
  }
  return items;
}
