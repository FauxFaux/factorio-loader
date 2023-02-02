"use strict";

var fs = _interopRequireWildcard(require("fs"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function main() {
  const doc = JSON.parse(fs.readFileSync("data.json", {
    encoding: 'utf-8'
  }));
  for (const [loc, obj] of Object.entries(doc)) {
    console.log(`<h1><a name="${loc}" href="#${loc}">${loc}</a></h1><ul>`);
    if (obj.tags.length) {
      console.log(` <li>Tags: ${obj.tags.sort().join(', ')}</li>`);
    }
    if (Object.keys(obj.asm).length) {
      console.log(` <li>Assemblers</li><ul>`);
      for (const [label, count] of Object.entries(obj.asm).sort((_ref, _ref2) => {
        let [, a] = _ref;
        let [, b] = _ref2;
        return b - a;
      })) {
        console.log(` <li>${count} * ${label}</li>`);
      }
      console.log('</ul>');
    }
    if (obj.stop.length) {
      console.log(` <li>Train stops</li><ul>`);
      for (const stop of obj.stop) {
        console.log(`  <li>${stop.name}<ul>`);
        for (const [kind, name, count] of stop.items.sort((_ref3, _ref4) => {
          let [,, a] = _ref3;
          let [,, b] = _ref4;
          return Math.abs(b) - Math.abs(a);
        })) {
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
main();

