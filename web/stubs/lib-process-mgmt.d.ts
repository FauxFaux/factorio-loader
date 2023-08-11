declare module 'process-mgmt/src/structures.js' {
  import type { RecipeName } from '../muffler/walk-recipes';

  export class Item {
    constructor(id: string, name: string, group?: string);
    id: string;
    name: string;
  }

  export class Factory {
    constructor(
      id: string,
      name: string,
      groups: [] | null,
      duration_modifier = 1,
      output_modifier = 1,
    );
  }
  export class FactoryGroup {
    constructor(name: string);
    id: string;
    name: string;
  }

  export class Stack {
    constructor(item: Item, count: number);
  }
  export class Process {
    // duration is execution seconds (as shown in game)
    constructor(
      id: RecipeName,
      inputs: Stack[],
      outputs: Stack[],
      duration: number,
      group: FactoryGroup,
    );
    id: RecipeName;
    // incomplete
  }

  export class ProcessChain {
    constructor(procs: Process[]);
    accept(visitor: any): this;
    process_counts: Record<RecipeName, number>;
  }
}

declare module 'process-mgmt/src/visit/rate_visitor.js' {
  import type { Factory, Process } from 'process-mgmt/src/structures.js';

  export class RateVisitor {
    constructor(rateify: (proc: Process) => Factory | undefined);
  }
}

declare module 'process-mgmt/src/visit/linear_algebra_visitor.js' {
  import type { Stack } from 'process-mgmt/src/structures.js';

  type BareItemName = string;

  export class LinearAlgebra {
    constructor(
      requirements: Stack[],
      imports: BareItemName[],
      exports: BareItemName[],
      print_matrices?: boolean,
    );
    visit(process: any): void;
    print_matricies?: boolean;
  }
}

declare module 'process-mgmt/src/visit/process_count_visitor.js' {
  export class ProcessCountVisitor {
    constructor();
    visit(process: any): void;
  }
}

declare module 'process-mgmt/src/factorio-py-1.1.53/data.js' {
  export default {
    processes: Record<string, unknown>,
  };
}
