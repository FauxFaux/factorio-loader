import { Component } from 'preact';
import type { BrotliWasmType } from 'brotli-wasm';
import { useEffect } from 'preact/hooks';
import * as base64 from '@protobufjs/base64';

import { productAsFloat, RecipeName } from '../muffler/walk-recipes';
import { data } from '../datae';
import { ColonJoined } from '../objects';
import { Colon } from '../muffler/colon';
import { LongName } from './recipes';
import { humanise } from '../muffler/human';
import { route } from 'preact-router';

interface Job {
  recipe: RecipeName;
  craftingSpeed: number;
  count: number;
}

interface Manifest {
  jobs: Job[];
}

const US = '/an/plan/';

interface PlanState {
  brotli: BrotliWasmType | null;
  manifest: Manifest;
}

export class Plan extends Component<{ encoded?: string }, PlanState> {
  render(props: { encoded?: string }, state: PlanState) {
    const brotli = state.brotli;
    if (brotli === undefined) {
      loadBrotli(this.setState.bind(this));
      return <div>Downloading unnecessary dependency...</div>;
    }
    if (brotli === null) {
      return <div>Failed to load brotli-wasm, see console for details</div>;
    }
    if (!state.manifest) {
      const manifest = unpack(props.encoded, brotli);
      this.setState({ manifest });
      return <div>Too lazy to fix the flow control...</div>;
    }

    const effects: Record<Colon, number> = {};
    for (const job of state.manifest.jobs) {
      const recp = data.recipes.regular[job.recipe];
      const scale = (job.count * job.craftingSpeed) / recp.time;
      for (const ing of recp.ingredients) {
        effects[ing.colon] = (effects[ing.colon] || 0) - ing.amount * scale;
      }
      for (const prod of recp.products) {
        effects[prod.colon] =
          (effects[prod.colon] || 0) + productAsFloat(prod) * scale;
      }
    }

    const effectsSection = (
      <div class={'row'}>
        <div class={'col'}>
          <h3>Net</h3>
          <ul>
            {Object.entries(effects)
              .sort(([, a], [, b]) => b - a)
              .filter(([, amount]) => amount != 0)
              .map(([colon, amount]) => (
                <li>
                  {humanise(amount)} &times; <ColonJoined colon={colon} />
                </li>
              ))}
          </ul>
        </div>
      </div>
    );

    return (
      <>
        <div className={'row'}>
          <div className={'col'}>
            <button
              onClick={() => route(`${US}${pack(state.manifest, brotli)}`)}
            >
              Save
            </button>
          </div>
        </div>
        {effectsSection}
        <div class={'row'}>
          <div class={'col'}>
            <ManifestTable
              manifest={state.manifest}
              onChange={(manifest) => this.setState({ manifest })}
            />
          </div>
        </div>
      </>
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

interface ManifestTableProps {
  manifest: Manifest;
  onChange: (manifest: Manifest) => void;
}

interface ManifestState {
  manifest: Manifest;
}

export class ManifestTable extends Component<
  ManifestTableProps,
  ManifestState
> {
  state = {
    manifest: this.props.manifest,
  };

  render(props: ManifestTableProps, state: ManifestState) {
    const manifest = state.manifest;

    return (
      <table class={'table'}>
        <thead>
          <tr>
            <th>Recipe</th>
            <th>Count</th>
            <th>Speed</th>
            <th>Ingredients</th>
            <th>Products</th>
          </tr>
        </thead>
        <tbody>
          {manifest.jobs.map((job) => {
            const recp = data.recipes.regular[job.recipe];
            const scale = (job.count * job.craftingSpeed) / recp.time;
            return (
              <tr>
                <td>
                  <LongName
                    name={job.recipe}
                    recipe={data.recipes.regular[job.recipe]}
                  />
                </td>
                <td>
                  <button
                    onClick={() => {
                      job.count -= 1;
                      this.setState({ manifest });
                      this.props.onChange(manifest);
                    }}
                  >
                    -
                  </button>
                  {job.count}
                  <button
                    onClick={() => {
                      job.count += 1;
                      this.setState({ manifest });
                      this.props.onChange(manifest);
                    }}
                  >
                    +
                  </button>
                </td>
                <td>{job.craftingSpeed}</td>
                <td>
                  {data.recipes.regular[job.recipe].ingredients.map((ing) => (
                    <li>
                      {humanise(ing.amount * scale)} &times;{' '}
                      <ColonJoined colon={ing.colon} />
                    </li>
                  ))}
                </td>
                <td>
                  {data.recipes.regular[job.recipe].products.map((prod) => (
                    <li>
                      {humanise(productAsFloat(prod) * scale)} &times;{' '}
                      <ColonJoined colon={prod.colon} />
                    </li>
                  ))}
                </td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={5}>
              <PickRecipe
                puck={(recipe) => {
                  manifest.jobs.push({
                    recipe,
                    craftingSpeed: 1,
                    count: 1,
                  });
                  this.setState({ manifest });
                  this.props.onChange(manifest);
                }}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}

class PickRecipe extends Component<{ puck: (recipe: string) => void }> {
  onChange = (e: Event) => {
    const recipe = (e.target as HTMLInputElement).value;
    this.setState({ recipe });
    this.props.puck(recipe);
  };
  render(props: { puck: () => void }, state: { recipe: string }) {
    return (
      <select value={state.recipe} onChange={this.onChange}>
        {Object.keys(data.recipes.regular).map((recipe) => (
          <option value={recipe}>{recipe}</option>
        ))}
      </select>
    );
  }
}
