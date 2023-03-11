#!/usr/bin/env -S npx babel-node -x .ts,.tsx

import JsSha from 'jssha/dist/sha3';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import { sortByKeys } from '../web/muffler/deter';

async function main() {
  const outDir = __dirname + '/../dist/';
  mkdirSync(outDir, { recursive: true });

  const cwd = __dirname + '/../data/';
  const data: Record<string, string> = {};
  for (const file of globSync('**/{*.json,*.svg}', { cwd })) {
    const hash = new JsSha('SHAKE128', 'TEXT', { encoding: 'UTF8' });
    hash.update(readFileSync(cwd + file, { encoding: 'utf8' }));
    data[file] = hash.getHash('HEX', { outputUpper: false, outputLen: 8 * 8 });
  }

  writeFileSync(`${outDir}hashes.json`, JSON.stringify(sortByKeys(data)));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
