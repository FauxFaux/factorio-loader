import type { BlockContent } from './load-recs';
import * as fs from 'fs';

function main() {
  const doc: Record<string, BlockContent> = JSON.parse(fs.readFileSync("data.json", { encoding: 'utf-8' }));
  for (const [loc, obj] of Object.entries(doc)) {
    console.log(`<h1><a name="${loc}" href="#${loc}">${loc}</a></h1><ul>`);
    if (obj.tags.length) {
      console.log(` <li>Tags: ${obj.tags.sort().join(', ')}</li>`);
    }
    if (Object.keys(obj.asm).length) {
      console.log(` <li>Assemblers</li><ul>`);
      for (const [label, count] of Object.entries(obj.asm).sort(([, a], [, b]) => b - a)) {
        console.log(` <li>${count} * ${label}</li>`);
      }
      console.log('</ul>');
    }

    if (obj.stop.length) {
      console.log(` <li>Train stops</li><ul>`);
      for (const stop of obj.stop) {
        console.log(`  <li>${stop.name}<ul>`);
        for (const [kind, name, count] of stop.items.sort(([,,a], [,,b]) => Math.abs(b)-Math.abs(a))) {
          if (kind === 'virtual') continue;
          console.log(`   <li>${count} * ${kind}:${name}</li>`);
        }
        console.log('  </ul></li>');
      }
      console.log(' </ul>');
    }
    console.log('</ul>');
  }
}

main()
