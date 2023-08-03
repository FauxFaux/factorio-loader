import { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { serializeError } from 'serialize-error';

import type { BrotliWasmType } from 'brotli-wasm';
import type Leaflet from 'leaflet';
import type * as ProcessMgmt from '../stubs/process-mgmt';
import * as base64 from '@protobufjs/base64';

type Lib = 'brotli-wasm' | 'leaflet' | 'process-mgmt';

async function load(lib: Lib) {
  switch (lib) {
    case 'brotli-wasm':
      return import(/* webpackPrefetch: true */ 'brotli-wasm').then(
        (lib) => lib.default,
      );
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

export function unpack(encoded: string, brotli: BrotliWasmType): unknown {
  const deWeb = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = deWeb.padEnd(
    deWeb.length + ((4 - (deWeb.length % 4)) % 4),
    '=',
  );
  const len = base64.length(padded);
  const buffer = new Uint8Array(len);
  base64.decode(padded, buffer, 0);
  return JSON.parse(new TextDecoder().decode(brotli.decompress(buffer)));
}

export function pack(obj: unknown, brotli: BrotliWasmType): string {
  const buffer = brotli.compress(new TextEncoder().encode(JSON.stringify(obj)));
  return base64
    .encode(buffer, 0, buffer.length)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
