import { Component } from 'preact';
import type { BrotliWasmType } from 'brotli-wasm';
import { useEffect } from 'preact/hooks';
import * as base64 from '@protobufjs/base64';
import { RecipeName } from '../muffler/walk-recipes';
import { route } from 'preact-router';

type AssemblerName = string;

interface Job {
  recipe: RecipeName;
  assembler: AssemblerName;
  count: number;
}

interface Manifest {
  jobs: Job[];
}

const US = '/an/plan/';

export class Plan extends Component<
  { encoded?: string },
  { brotli: BrotliWasmType | null }
> {
  render(
    props: { encoded?: string },
    state: { brotli: BrotliWasmType | null },
  ) {
    const brotli = state.brotli;
    if (brotli === undefined) {
      loadBrotli(this.setState.bind(this));
      return <div>Downloading unnecessary dependency...</div>;
    }
    if (brotli === null) {
      return <div>Failed to load brotli-wasm, see console for details</div>;
    }
    const manifest = unpack(props.encoded, brotli);

    return (
      <div>
        {JSON.stringify(manifest)}
        <button
          onClick={() => {
            manifest.jobs.push({
              recipe: 'iron-plate',
              assembler: 'assembling-machine-1',
              count: 1,
            });
            route(`${US}${pack(manifest, brotli)}`);
          }}
        >
          Add
        </button>
      </div>
    );
  }
}

function unpack(encoded: string | undefined, brotli: BrotliWasmType): Manifest {
  if (!encoded)
    return {
      jobs: [],
    };
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

function pack(manifest: Manifest, brotli: BrotliWasmType): string {
  const buffer = brotli.compress(
    new TextEncoder().encode(JSON.stringify(manifest)),
  );
  return base64
    .encode(buffer, 0, buffer.length)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function loadBrotli(
  setState: Component<unknown, { brotli: BrotliWasmType | null }>['setState'],
) {
  useEffect(() => {
    void (async () => {
      try {
        const brotli = await (await import('brotli-wasm')).default;
        setState({ brotli });
      } catch (err) {
        console.error(err);
        setState({ brotli: null });
      }
    })();
  }, []);
}
