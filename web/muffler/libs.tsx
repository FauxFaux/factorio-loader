import { JSX } from "preact";
import { BrotliWasmType } from "brotli-wasm";
import { useState } from "preact/hooks";
import { serializeError } from "serialize-error";

export function useBrotli():
  | ['message', JSX.Element]
  | ['ready', BrotliWasmType] {
  const [state, setState] = useState({ lib: null, error: null } as {
    lib: BrotliWasmType | null;
    error: Error | null;
  });
  if (state.error) {
    return ['message', <>Loading failed: {serializeError(state.error)}</>];
  }
  if (state.lib) {
    return ['ready', state.lib];
  }
  import('brotli-wasm')
    .then((lib) => {
      setState({ lib, error: null });
    })
    .catch((error) => {
      console.error('Failed to load brotli-wasm', error);
      setState({ lib: null, error });
    });

  return ['message', <>Loading brotli...</>];
}
