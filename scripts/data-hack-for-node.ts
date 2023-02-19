import { readFileSync } from 'fs';
import { data, precompute } from '../web';

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
