import { readFileSync } from 'fs';
import { data, precompute } from '../web';
import fs from 'fs';

export function initOnNode(exclude: (keyof typeof data)[] = []) {
  for (const key of Object.keys(data) as (keyof typeof data)[]) {
    if (exclude.includes(key)) continue;
    (data as any)[key] = JSON.parse(
      readFileSync(require.resolve(`../data/${key}.json`), {
        encoding: 'utf-8',
      }),
    );
  }
  precompute();
}

export function loadTrainFlows() {
  return fs
    .readFileSync(require.resolve('../data/trainFlows.jsonl'), {
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
}
