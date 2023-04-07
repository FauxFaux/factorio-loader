import { Component } from 'preact';
import { route } from 'preact-router';
import type { BrotliWasmType } from 'brotli-wasm';
import { useEffect } from 'preact/hooks';
import * as base64 from '@protobufjs/base64';

import { productAsFloat, RecipeName } from '../muffler/walk-recipes';
import { data } from '../datae';
import { ColonJoined, RecipeInOut } from '../objects';
import { Colon } from '../muffler/colon';

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
  pickRecipe: string;
  pickCount: number;
  pickSpeed: number;
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
    const manifest = unpack(props.encoded, brotli);

    const addRecipe = (
      <div class={'row'}>
        <div class={'col'}>
          <select value={state.pickRecipe} onChange={this.pickRecipeChange}>
            {Object.keys(data.recipes.regular).map((recipe) => (
              <option value={recipe}>{recipe}</option>
            ))}
          </select>
          <input
            value={state.pickCount}
            onInput={this.pickCountChange}
            type="number"
            min={0}
          />
          <input
            value={state.pickSpeed}
            onInput={this.pickSpeedChange}
            type="number"
            step={0.01}
            min={0}
          />
          <button
            onClick={() => {
              manifest.jobs.push({
                recipe: state.pickRecipe,
                craftingSpeed: 1,
                count: state.pickCount,
              });
              route(`${US}${pack(manifest, brotli)}`);
            }}
          >
            Add
          </button>
        </div>
      </div>
    );

    const effects: Record<Colon, number> = {};
    for (const job of manifest.jobs) {
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
                  {amount} &times; <ColonJoined colon={colon} />
                </li>
              ))}
          </ul>
        </div>
      </div>
    );

    return (
      <>
        {effectsSection}

        {addRecipe}
        <div class={'row'}>
          <div class={'col'}>
            <table class={'table'}>
              <thead>
                <tr>
                  <th>Recipe</th>
                  <th>Count</th>
                  <th>Speed</th>
                </tr>
              </thead>
              <tbody>
                {manifest.jobs.map((job) => (
                  <tr>
                    <td>{job.recipe}</td>
                    <td>{job.count}</td>
                    <td>{job.craftingSpeed}</td>
                    <td>
                      <RecipeInOut name={job.recipe} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  pickCountChange = (e: Event) => {
    this.setState({
      pickCount: parseInt((e.target as HTMLInputElement).value),
    });
  };

  pickRecipeChange = (e: Event) => {
    this.setState({ pickRecipe: (e.target as HTMLInputElement).value });
  };

  pickSpeedChange = (e: Event) => {
    this.setState({
      pickSpeed: parseFloat((e.target as HTMLInputElement).value),
    });
  };
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
