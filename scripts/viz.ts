#!/usr/bin/env -S npx babel-node -x .ts,.tsx

import { data } from '../web';
import { initOnNode } from './data-hack-for-node';

initOnNode();

function main() {
  console.log('digraph {rankdir="LR";');
  const included = new Set<string>();
  for (const [, obj] of Object.entries(data.doc)) {
    for (const stop of obj.stop) {
      for (const [type, item] of stop.provides) {
        included.add(`${type}:${item}`);
      }
    }
  }
  for (const [name, obj] of Object.entries(data.doc)) {
    const block = `${name} (${obj.tags.join(',')})`;
    for (const stop of obj.stop) {
      for (const [type, item] of stop.provides) {
        if (item === 'empty-barrel') continue;
        console.log(`  "${block}" -> "${type}:${item}"`);
      }

      for (const [type, item, value] of stop.combinator) {
        if (item === 'empty-barrel') continue;
        if (type !== 'virtual' && value < 0) {
          const key = `${type}:${item}`;
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
