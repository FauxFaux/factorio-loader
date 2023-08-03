declare module 'process-mgmt/src/structures.js' {
  export class Factory {
    constructor();
    createStack(): Stack;
  }
  export class Stack {
    constructor();
    push(item: any): void;
    pop(): any;
    peek(): any;
    isEmpty(): boolean;
  }
  export class ProcessChain {
    constructor();
    addProcess(process: any): void;
    removeProcess(process: any): void;
    getProcess(): any;
    isEmpty(): boolean;
  }
}
