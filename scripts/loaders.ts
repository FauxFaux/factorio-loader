import fs from 'fs';

const base = process.argv[2];

export function loadCells(kind: string): string[][] {
  return loadLines(kind).map((record) => record.split('\x1e'));
}

export function loadLines(kind: string): string[] {
  return fs
    .readFileSync(`${base}/${kind}.rec`, { encoding: 'utf-8' })
    .split('\x1d'); // (\035)
}

export function loadSamples(kind: string): string[] {
  return fs
    .readFileSync(`${base}/cp-${kind}.rec`, { encoding: 'utf-8' })
    .split('\x1c'); // (\034)
}
