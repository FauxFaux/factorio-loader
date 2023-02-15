import { readFileSync } from 'fs';
import { data } from '../web';

export function initOnNode(exclude: string[] = []) {
  for (const key of Object.keys(data)) {
    if (exclude.includes(key)) continue;
    (data as any)[key] = JSON.parse(
      readFileSync(require.resolve(`../data/${key}.json`), {
        encoding: 'utf-8',
      }),
    );
  }
}
