// loaded by libs.tsx; do not import directly?

import {
  Item,
  Factory,
  Stack,
  Process,
  ProcessChain,
  FactoryGroup,
} from 'process-mgmt/src/structures.js';
import { RateVisitor } from 'process-mgmt/src/visit/rate_visitor.js';
import { LinearAlgebra } from 'process-mgmt/src/visit/linear_algebra_visitor.js';
import { ProcessCountVisitor } from 'process-mgmt/src/visit/process_count_visitor.js';

import {
  makeUpRecipe,
  productAsFloat,
  RecipeName,
} from '../muffler/walk-recipes';
import { Colon, splitColon } from '../muffler/colon';
import { FRecipe } from '../objects';

type BareItemName = string;

function inferFueling(facto: FRecipe, speed: number) {
  const base = facto
    .ingredients()
    .map((i) => new Stack(colonToItem(i.colon), i.amount));

  let kW = 0;
  switch (facto.producerClass) {
    case 'atomizer':
      switch (Math.round(speed)) {
        case 1:
          kW = 900;
          break;
        case 2:
          kW = 1000;
          break;
        case 3:
          kW = 1100;
          break;
        case 4:
          kW = 1200;
          break;
      }
  }

  if (kW) {
    base.push(
      new Stack(
        colonToItem('fluid:combustion-mixture'),
        (kW * facto.time) / 3600,
      ),
    );
  }

  return base;
}

function processFromRecipe(p: string, speed: number) {
  const facto = makeUpRecipe(p);
  if (!facto) {
    throw new Error(`no recipe for ${p}`);
  }
  // noinspection UnnecessaryLocalVariableJS
  const fake = new Process(
    p,
    inferFueling(facto, speed),
    facto.products.map(
      (i) => new Stack(colonToItem(i.colon), productAsFloat(i)),
    ),
    facto.time,
    new FactoryGroup(facto.producerClass),
  );

  // this doesn't work great, as we re-sort things,
  // and disagree on factory group names (which I don't think anyone is looking at)
  // const real: Process | undefined = pmDb.processes[p];
  // if (fake.toString() !== real?.toString()) {
  //   console.log({ fake, real });
  // }
  return fake;
}

export function runSomething(inputs: {
  requirements: Record<Colon, number>;
  imports: Colon[];
  exports: Colon[];
  recipes: Record<RecipeName, { craftingSpeed: number }>;
}) {
  const laReqs = Object.entries(inputs.requirements).map(
    ([colon, count]) => new Stack(colonToItem(colon), count),
  );
  const laImports = inputs.imports.map((colon) => colonToItem(colon).id);
  const laExports = inputs.exports.map((colon) => colonToItem(colon).id);
  const lav = new LinearAlgebra(laReqs, laImports, laExports);
  const pcProcs = Object.entries(inputs.recipes).map(([p, { craftingSpeed }]) =>
    processFromRecipe(p, craftingSpeed),
  );
  console.log({ laReqs, laImports, laExports, pcProcs });
  const chain = new ProcessChain(pcProcs)
    .accept(
      new RateVisitor(
        (recp) =>
          new Factory(
            '__unused__',
            '__unused__',
            null,
            1 / (inputs.recipes[recp.id].craftingSpeed ?? 1),
          ),
      ),
    )
    .accept(new ProcessCountVisitor())
    .accept(lav);
  return {
    recipeCounts: chain.process_counts as Record<RecipeName, number>,
  };
}

const itemCache: Record<BareItemName, Item> = {};

function colonToItem(colon: Colon): Item {
  const id = stripColon(colon);
  if (!itemCache[id]) {
    itemCache[id] = new Item(id, id);
  }
  return itemCache[id];
}

function stripColon(colon: Colon): BareItemName {
  return splitColon(colon)[1];
}
