// loaded by libs.tsx; do not import directly?

import {
  Item,
  Factory,
  Stack,
  ProcessChain,
} from 'process-mgmt/src/structures.js';
import { RateVisitor } from 'process-mgmt/src/visit/rate_visitor.js';
import { LinearAlgebra } from 'process-mgmt/src/visit/linear_algebra_visitor.js';
import { ProcessCountVisitor } from 'process-mgmt/src/visit/process_count_visitor.js';
import pmDb from 'process-mgmt/src/factorio-py-1.1.53/data.js';

import { RecipeName } from '../muffler/walk-recipes';
import { Colon, splitColon } from '../muffler/colon';

type BareItemName = string;

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
  const pcProcs = Object.keys(inputs.recipes).map((p) => pmDb.processes[p]);
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

function colonToItem(colon: Colon): Item {
  const id = stripColon(colon);
  return new Item(id, id);
}

function stripColon(colon: Colon): BareItemName {
  return splitColon(colon)[1];
}
