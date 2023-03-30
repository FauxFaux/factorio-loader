#!/usr/bin/env -S npx babel-node -x .ts,.tsx
import * as fs from 'fs';
import * as yaml from 'js-yaml';

import { initOnNode, loadTrainFlows } from './data-hack-for-node';
import { Coord, data } from '../web/datae';
import {
  isProvideStation,
  provideStationPurpose,
} from '../web/muffler/stations';
import { Colon, objToColon, tupleToColon } from '../web/muffler/colon';
import { sortByKeys } from '../web/muffler/deter';
import { JIngredient, JProduct, JRecipe } from '../web/objects';
import { BlockId, loadCells, loadRec } from './loaders';

initOnNode(['doc', 'technologies', 'prodStats']);

function distSq(a: Coord, b: Coord) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/** type, name, count
 * e.g. "item", "empty-barrel", -9000
 */
type Signal = [string, string, number];

export type Stop = {
  /** the in-game, encoded name of the station */
  name: string;
  /** save-persistent number of the stop */
  stopId: number;
  /** signals on the 'settings' wire, typically ltn configuration like stack size */
  settings: Signal[];
  /** signals on the 'items' wire, positive for provide, negative for *outstanding* requests */
  items: Signal[];
  /** information *from the name* about what this station provides */
  // type, name
  provides: [string, string][];
  /** information from nearby combinators about what this station may be requesting */
  combinator: Signal[];

  gps: readonly [number, number];

  /** the amount of stuff leaving and arriving at this stop */
  flowFrom: Record<Colon, number>;
  flowTo: Record<Colon, number>;
};

export type BlockContent = {
  tags: string[];
  asm: Record<string, { count: number; locations: Coord[] }>;
  stop: Stop[];
  items: Record<string, number>;
  fluids: Record<string, number>;
  resources: Record<string, number>;
  boilers: number;
};

interface Patch {
  name: Record<string, string>;
  merge: Record<string, string[]>;
}

function main() {
  const voidableItems = new Set<Colon>();
  const barrelFormOf: Record<string, string> = {};
  const regular: Record<string, JRecipe> = {};

  const lab: Lab = JSON.parse(
    fs.readFileSync(require.resolve('../raw/lab-export-76.json'), 'utf-8'),
  );

  const producers = Object.fromEntries(
    lab.recipes.map((rec) => [rec.id, stripProducers(rec.producers)] as const),
  );

  const recipeDurations = Object.fromEntries(
    lab.recipes.map((rec) => [rec.id, rec.time] as const),
  );

  const tools: Tools = JSON.parse(
    fs.readFileSync(
      require.resolve('../raw/rust-tools-export-76.json'),
      'utf-8',
    ),
  );

  // this isn't technically 1->1 I think, but it works for like rails, and the rest of the data is actually missing (for now)
  // (in practice this gets zero correct answers)
  const placeOverrides = Object.fromEntries(
    Object.entries(tools.item_prototypes)
      .map(([name, item]) => [item.place_result?.name, name] as const)
      .filter(([name, place]) => name !== place && place !== undefined),
  );

  placeOverrides['curved-rail'] = 'rail';
  placeOverrides['straight-rail'] = 'rail';
  placeOverrides['pumpjack'] = 'pumpjack-mk01';

  for (const [name, rec] of Object.entries(tools.recipe_prototypes)) {
    if (name.endsWith('-pyvoid')) {
      if (
        rec.products.length !== 1 ||
        rec.products[0].name !== 'ash' ||
        rec.products[0].amount !== 1 ||
        rec.ingredients.length !== 1
      ) {
        throw new Error(`invalid pyvoid item recipe: ${name}`);
      }

      const ing = rec.ingredients[0];
      if (ing.type !== 'item' || ing.amount !== 1) {
        throw new Error('pyvoid recipe should consume exactly one item');
      }

      voidableItems.add(objToColon(ing));

      continue;
    }
    if (name.endsWith('-pyvoid-fluid') || name.endsWith('-pyvoid-gas')) {
      const ing = rec.ingredients[0];
      if (ing.type !== 'fluid') {
        throw new Error(
          `pyvoid-fluid/pyvoild-gas recipe should consume fluids: ${name}`,
        );
      }
      voidableItems.add(objToColon(ing));
      continue;
    }

    if (
      rec.ingredients?.length === 2 &&
      rec.products?.length === 1 &&
      rec.products?.[0]?.type === 'item' &&
      undefined !== rec.ingredients?.find((ing) => ing.name === 'empty-barrel')
    ) {
      const fluid = rec.ingredients.find(
        (ing) => ing.name !== 'empty-barrel' && ing.type === 'fluid',
      );
      if (fluid) {
        barrelFormOf[fluid.name] = rec.products[0].name;
        continue;
      }
    }

    regular[name] = {
      category: rec.category,
      localised_name: rec.localised_name,
      ingredients: nameTypeToColon(rec.ingredients ?? []) as JIngredient[],
      products: nameTypeToColon(rec.products ?? []) as JProduct[],
      producers: producers[name],
      time: recipeDurations[name],
    };
    if (rec.enabled) {
      regular[name].unlocked_from_start = true;
    }
  }

  const recipes = {
    regular: sortByKeys(regular),
    voidableItems: Array.from(voidableItems).sort(),
    barrelFormOf: sortByKeys(barrelFormOf),
    placeOverrides,
  };

  const patch = yaml.load(
    fs.readFileSync(require.resolve('../patch.yaml'), 'utf8'),
  ) as Patch;
  const remappings = Object.fromEntries(
    Object.entries(patch.merge).flatMap(([dest, srcs]) =>
      srcs.map((src) => [src, dest] as const),
    ),
  );

  const byBlock: Record<string, BlockContent> = {};
  const getBlock = (id: BlockId | string) => {
    let sid = String(id);
    if (remappings[sid]) {
      sid = remappings[sid];
    }
    if (!byBlock[sid]) {
      byBlock[sid] = {
        tags: [],
        asm: {},
        stop: [],
        items: {},
        fluids: {},
        resources: {},
        boilers: 0,
      };
    }
    return byBlock[sid];
  };

  for (const obj of loadRec('tags')) {
    const block = getBlock(obj.block);
    block.tags.push(obj.name);
  }

  for (const [id, name] of Object.entries(patch.name)) {
    getBlock(id).tags = [name];
  }

  for (const obj of loadRec('assembling-machine')) {
    const block = getBlock(obj.block);
    const label = `${obj.name}\0${obj.ext[0]}`;
    if (!block.asm[label]) {
      block.asm[label] = { count: 0, locations: [] };
    }
    block.asm[label].count++;
    block.asm[label].locations.push(obj.pos);
  }

  // close enough, eh
  for (const obj of loadRec('furnace')) {
    const block = getBlock(obj.block);
    const label = `${obj.name}\0${obj.ext[0]}`;
    if (!block.asm[label]) {
      block.asm[label] = { count: 0, locations: [] };
    }
    block.asm[label].count++;
    block.asm[label].locations.push(obj.pos);
  }

  for (const block of Object.values(byBlock)) {
    for (const obj of Object.values(block.asm)) {
      obj.locations.sort();
      obj.locations = obj.locations.slice(0, 2);
    }
  }

  for (const obj of loadRec('boiler')) {
    const block = getBlock(obj.block);
    block.boilers += 1;
  }

  const stopNames: [Coord, string, number][] = [];
  for (const obj of loadRec('train-stop')) {
    if (obj.name !== 'logistic-train-stop') continue;
    stopNames.push([obj.pos, obj.ext[0], parseInt(obj.ext[1])]);
  }

  function nearbyStation(pos: Coord, maxDist: number): [Coord, string, number] {
    for (const [stopLoc, stopName, stopId] of stopNames) {
      const d = distSq(pos, stopLoc);
      if (d < maxDist) {
        return [stopLoc, stopName, stopId];
      }
    }
    throw new Error(`unable to find name for ${pos}`);
  }

  const stopCombinator: Record<string, string[]> = {};

  for (const obj of loadRec('constant-combinator')) {
    if (obj.name !== 'constant-combinator') continue;
    let stop;
    try {
      stop = nearbyStation(obj.pos, 3);
    } catch {
      continue;
    }

    const loc = String(stop[0]);

    if (!stopCombinator[loc]) stopCombinator[loc] = [];
    stopCombinator[loc].push(...obj.ext);
  }

  const flowFrom: Record<number, Record<string, number>> = {};
  const flowTo: Record<number, Record<string, number>> = {};

  for (const flow of loadTrainFlows()) {
    if (!flowFrom[flow.from]) flowFrom[flow.from] = {};
    const f = flowFrom[flow.from];
    if (!flowTo[flow.to]) flowTo[flow.to] = {};
    const t = flowTo[flow.to];

    for (const [name, count] of Object.entries(flow.shipment)) {
      const colon = name.replace(',', ':');
      if (!f[colon]) f[colon] = 0;
      f[colon] += count;

      if (!t[colon]) t[colon] = 0;
      t[colon] += count;
    }
  }

  for (const obj of loadRec('train-stop-input')) {
    const block = getBlock(obj.block);
    const [stopLoc, name, stopId] = nearbyStation(obj.pos, 1);
    const splitPoint = obj.ext.indexOf('red');
    const red = obj.ext.slice(1, splitPoint);
    const green = obj.ext.slice(splitPoint + 1);
    const comb = stopCombinator[String(stopLoc)];
    block.stop.push({
      name,
      stopId,
      flowFrom: flowFrom[stopId] || {},
      flowTo: flowTo[stopId] || {},
      settings: signals(red),
      items: signals(green),
      gps: obj.pos,
      provides: isProvideStation(name)
        ? [...provideStationPurpose(name)].map((v) => ['item', v])
        : [],
      combinator: comb ? signals(comb) : [],
    });
  }

  function addItems(items: Record<string, number>, obj: { ext: string[] }) {
    for (let i = 0; i < obj.ext.length; i += 2) {
      const itemName = obj.ext[i];
      const itemCount = parseInt(obj.ext[i + 1]);
      if (!items[itemName]) items[itemName] = 0;
      items[itemName] += itemCount;
    }
  }

  for (const obj of loadRec('container')) {
    const block = getBlock(obj.block);
    addItems(block.items, obj);
  }

  for (const obj of loadRec('logistic-container')) {
    const block = getBlock(obj.block);
    addItems(block.items, obj);
  }

  for (const obj of loadRec('storage-tank')) {
    const block = getBlock(obj.block);
    addItems(block.fluids, obj);
  }

  for (const obj of loadRec('resource')) {
    const block = getBlock(obj.block);
    if (!block.resources[obj.name]) block.resources[obj.name] = 0;
    block.resources[obj.name] += parseInt(obj.ext[0]);
  }

  const technologies: (typeof data)['technologies'] = {};
  for (const tech of loadCells('technologies')) {
    const [name, researchedS, preCntS, ...rest] = tech;
    const researched = researchedS === '1';
    const preCnt = parseInt(preCntS);
    const requires = rest.slice(0, preCnt).sort();
    const unlocks = rest.slice(preCnt).sort();
    technologies[name] = {
      researched,
      requires,
      unlocks,
    };
  }

  fs.writeFileSync(
    'data/technologies.json',
    JSON.stringify(sortByKeys(technologies)),
    { encoding: 'utf-8' },
  );

  const prodStats: (typeof data)['prodStats'] = {};
  for (const type of ['item', 'fluid'] as const) {
    for (const direction of ['input', 'output'] as const) {
      for (const line of loadCells(`${type}-${direction}`)) {
        const [name, totalS, ...extS] = line;
        const colon = tupleToColon([type, name]);
        if (!prodStats[colon]) prodStats[colon] = {};
        const total = parseInt(totalS);
        const perTime = extS.map((v) => parseFloat(v));
        prodStats[colon][direction] = { total, perTime };
      }
    }
  }

  for (const flow of Object.values(flowFrom)) {
    for (const [name, count] of Object.entries(flow)) {
      if (!prodStats[name]) prodStats[name] = { ltn: 0 };
      const p = prodStats[name];
      if (!p.ltn) p.ltn = 0;
      p.ltn += count;
    }
  }

  fs.writeFileSync(
    'data/prodStats.json',
    JSON.stringify(sortByKeys(prodStats)),
    {
      encoding: 'utf-8',
    },
  );

  fs.writeFileSync('data/recipes.json', JSON.stringify(recipes), {
    encoding: 'utf-8',
  });

  fs.writeFileSync('data/doc.json', JSON.stringify(byBlock), {
    encoding: 'utf-8',
  });
}

function signals(arr: string[]): [string, string, number][] {
  const res: [string, string, number][] = [];
  for (let i = 0; i < arr.length; i += 3) {
    res.push([arr[i], arr[i + 1], parseFloat(arr[i + 2])]);
  }
  return res;
}

function nameTypeToColon(items: Record<string, any>[]) {
  return items
    .map((item) => {
      const { name, type, ...next } = item;
      if (!name || !type)
        throw new Error(`missing name/type: ${JSON.stringify(item)}`);
      const colon = tupleToColon([type, name]);
      return { colon, ...next };
    })
    .sort((a, b) => a.colon.localeCompare(b.colon));
}

function stripProducers(producers: string[]): string[] {
  return [
    ...new Set(
      producers.map((p) =>
        p
          .replace(/-mk0\d|-\d$/, '')
          .replace('assembling-machine', 'automated-factory'),
      ),
    ),
  ].sort();
}

interface Tools {
  recipe_prototypes: Record<
    string,
    {
      ingredients: Array<{ amount: number; name: string; type: string }>;
      products: Array<{
        amount?: number;
        name: string;
        probability?: number;
        type: string;
      }>;
      category: string;
      // "unlocked from start": https://wiki.factorio.com/Prototype/Recipe#enabled
      enabled: boolean;
      localised_name: string;
      time: number;
      // incomplete
    }
  >;
  item_prototypes: Record<
    string,
    {
      place_result?: { name: string };
    }
  >;
  // incomplete
}

interface Lab {
  recipes: { id: string; producers: string[]; time: number }[];
}

main();
