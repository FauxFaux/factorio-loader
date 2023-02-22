declare module '@bloomberg/record-tuple-polyfill' {
  type Primitive =
    | string
    | number
    | boolean
    | null
    | undefined
    | symbol
    | RecordInner;
  type RecordInner = Record<string, Primitive>;
  export function Tuple<T extends Array<Primitive>>(...args: T): T;
  export function Record<T extends RecordInner>(obj: T): T;
}
