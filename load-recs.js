"use strict";

var fs = _interopRequireWildcard(require("fs"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
const base = process.argv[2];
const [ox, oy] = [-14, -47];
const [w, h] = [192, 128];
function distSq(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}
function main() {
  const byBlock = {};
  const getBlock = id => {
    const sid = String(id);
    if (!byBlock[sid]) {
      byBlock[sid] = {
        tags: [],
        asm: {},
        stop: []
      };
    }
    return byBlock[sid];
  };
  for (const obj of load("tags")) {
    const block = getBlock(obj.block);
    block.tags.push(obj.name);
  }
  for (const obj of load("assembling-machine")) {
    const block = getBlock(obj.block);
    const label = `${obj.name} making ${obj.ext[0]}`;
    if (!block.asm[label]) {
      block.asm[label] = 0;
    }
    block.asm[label]++;
  }
  const stopNames = [];
  for (const obj of load("train-stop")) {
    if (obj.name !== "logistic-train-stop") continue;
    stopNames.push([obj.pos, obj.ext[0]]);
  }
  function nearbyStationName(pos) {
    for (const [stopLoc, stopName] of stopNames) {
      const d = distSq(pos, stopLoc);
      if (d < 1) {
        return stopName;
      }
    }
    throw new Error(`unable to find name for ${pos}`);
  }
  for (const obj of load("train-stop-input")) {
    const block = getBlock(obj.block);
    const name = nearbyStationName(obj.pos);
    const splitPoint = obj.ext.indexOf("red");
    const red = obj.ext.slice(1, splitPoint);
    const green = obj.ext.slice(splitPoint + 1);
    block.stop.push({
      name,
      settings: signals(red),
      items: signals(green)
    });
  }
  console.log(JSON.stringify(byBlock));
}
function signals(arr) {
  const res = [];
  for (let i = 0; i < arr.length; i += 3) {
    res.push([arr[i], arr[i + 1], parseFloat(arr[i + 2])]);
  }
  return res;
}
function load(kind) {
  const items = [];
  const content = fs.readFileSync(`${base}/${kind}.rec`, {
    encoding: "utf-8"
  });
  for (const line of content.split("\x1d") // (\035)
  .map(record => record.split("\x1e"))) {
    // (\036)
    const [x, y, dir, name, ...ext] = line;
    const pos = [parseFloat(x), parseFloat(y)];
    const block = toBlock(pos);
    items.push({
      block,
      name,
      ext,
      pos
    });
  }
  return items;
}
function toBlock(_ref) {
  let [x, y] = _ref;
  x -= ox;
  y -= oy;
  const by = Math.floor(y / h);
  if (Math.abs(by) % 2 == 1) {
    x -= w / 2;
  }
  const bx = Math.floor(x / w);
  return [bx, by];
}
main();

