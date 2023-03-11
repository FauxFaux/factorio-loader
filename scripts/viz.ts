#!/usr/bin/env -S npx babel-node -x .ts,.tsx

import { data } from '../web/datae.js';
import { initOnNode } from './data-hack-for-node.js';
import { tupleToColon } from '../web/muffler/colon.js';

initOnNode();

function main() {
  const banned = new Set([
    'empty-barrel',
    'py-storehouse-basic',
    'combustion-mixture',
  ]);
  console.log('digraph {rankdir="LR";');
  const included = new Set<string>();
  for (const [, obj] of Object.entries(data.doc)) {
    for (const stop of obj.stop) {
      for (const provides of stop.provides) {
        included.add(tupleToColon(provides));
      }
    }
  }
  for (const [name, obj] of Object.entries(data.doc)) {
    const block = `${name} (${obj.tags.join(',').replace(/"/g, "'")})`;
    for (const stop of obj.stop) {
      for (const [type, item] of stop.provides) {
        if (banned.has(item)) continue;
        console.log(`  "${block}" -> "${type}:${item}"`);
      }

      for (const [type, item, value] of stop.combinator) {
        if (banned.has(item)) continue;
        if (type !== 'virtual' && value < 0) {
          const key = tupleToColon([type, item]);
          if (included.has(key)) {
            console.log(`  "${key}" -> "${block}"`);
          }
        }
      }
    }
  }
  console.log('}');
}

main();
