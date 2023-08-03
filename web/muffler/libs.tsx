import { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { serializeError } from 'serialize-error';

import type { BrotliWasmType } from 'brotli-wasm';
import type Leaflet from 'leaflet';
import type * as ProcessMgmt from '../stubs/process-mgmt';

type Lib = 'brotli-wasm' | 'leaflet' | 'process-mgmt';

async function load(lib: Lib) {
  switch (lib) {
    case 'brotli-wasm':
      return import(/* webpackPrefetch: true */ 'brotli-wasm');
    case 'leaflet':
      return import(/* webpackPrefetch: true */ 'leaflet');
    case 'process-mgmt':
      return import(/* webpackPrefetch: true */ '../stubs/process-mgmt');
    default:
      return assertUnreachable(lib);
  }
}

export type LibState<T> = [JSX.Element, null] | [null, T];

export function useLib(lib: 'leaflet'): LibState<typeof Leaflet>;
export function useLib(lib: 'brotli-wasm'): LibState<BrotliWasmType>;
export function useLib(lib: 'process-mgmt'): LibState<typeof ProcessMgmt>;
export function useLib(lib: Lib): LibState<unknown> {
  const [state, setState] = useState({ lib: null, error: null } as {
    lib: unknown | null;
    error: Error | null;
  });
  if (state.error) {
    return [<>Loading failed: {serializeError(state.error)}</>, null];
  }
  if (state.lib) {
    return [null, state.lib];
  }
  load(lib)
    .then((lib) => {
      setState({ lib, error: null });
    })
    .catch((error) => {
      console.error(`Failed to load ${lib}`, error);
      setState({ lib: null, error });
    });

  return [<>Loading {lib}...</>, null];
}

function assertUnreachable(_value: never): never {
  throw new Error('Statement should be unreachable');
}
