import { Component } from 'preact';
import type { BrotliWasmType } from 'brotli-wasm';
import { useEffect } from 'preact/hooks';
import * as base64 from '@protobufjs/base64';

import { productAsFloat, RecipeName } from '../muffler/walk-recipes';
import { data } from '../datae';
import { ColonJoined, JRecipe } from '../objects';
import { Colon, fromColon, splitColon } from '../muffler/colon';
import { humanise } from '../muffler/human';
import { route } from 'preact-router';
import { ItemIcon, ItemList } from '../lists';

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
          <h3>Surplus</h3>
          <ul>
            {Object.entries(effects)
              .sort(([, a], [, b]) => b - a)
              .filter(([, amount]) => amount > 1e-4)
              .map(([colon, amount]) => (
                <li>
                  {humanise(amount)} &times; <ColonJoined colon={colon} />
                </li>
              ))}
          </ul>
        </div>
        <div className={'col'}>
          <h3>Missing</h3>
          <ul>
            {Object.entries(effects)
              .sort(([, a], [, b]) => b - a)
              .filter(([, amount]) => amount < -1e-4)
              .map(([colon, amount]) => (
                <li>
                  {humanise(amount)} &times; <ColonJoined colon={colon} />
                </li>
              ))}
          </ul>
        </div>
        <div className={'col'}>
          <h3>Balanced</h3>
          <ul>
            {Object.entries(effects)
              .sort(([, a], [, b]) => b - a)
              .filter(([, amount]) => Math.abs(amount) <= 1e-4)
              .map(([colon]) => (
                <li>
                  <ColonJoined colon={colon} />
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
            <p>
              <button
                class={'btn btn-primary'}
                onClick={() => route(`${US}${pack(state.manifest, brotli)}`)}
              >
                Save
              </button>
            </p>
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

    const table = (
      <table class={'table'}>
        <thead>
          <tr>
            <th></th>
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
                  <button
                    class={'btn btn-sm btn-danger'}
                    onClick={() => {
                      manifest.jobs.splice(manifest.jobs.indexOf(job), 1);
                      this.setState({ manifest });
                      this.props.onChange(manifest);
                    }}
                    title={'Remove job'}
                  >
                    ❌️
                  </button>
                </td>
                <td>
                  {recp.localised_name}{' '}
                  <span class={'text-muted'}>
                    ({job.recipe})<br />
                    Made in: {recp.producers?.join(', ') ?? '??'}
                  </span>
                </td>
                <td>
                  <input
                    class={'form-control'}
                    size={4}
                    style={'width: 5em; text-align: right'}
                    type={'number'}
                    min={0}
                    value={job.count}
                    onChange={(e) => {
                      job.count = parseInt(
                        (e.target as HTMLInputElement).value,
                      );
                      this.setState({ manifest });
                      this.props.onChange(manifest);
                    }}
                  />
                </td>
                <td>
                  <input
                    class={'form-control'}
                    size={6}
                    style={'width: 6em; text-align: right'}
                    type={'number'}
                    min={0}
                    step={0.2}
                    value={job.craftingSpeed}
                    onChange={(e) => {
                      job.craftingSpeed = parseFloat(
                        (e.target as HTMLInputElement).value,
                      );
                      this.setState({ manifest });
                      this.props.onChange(manifest);
                    }}
                  />
                </td>
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
        </tbody>
      </table>
    );

    return (
      <>
        {table}
        <hr />
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
      </>
    );
  }
}

class PickRecipe extends Component<{ puck: (recipe: string) => void }> {
  onChange = (e: Event) => {
    const recipe = (e.target as HTMLInputElement).value;
    this.setState({ recipe });
    this.props.puck(recipe);
  };

  render(
    props: { puck: () => void },
    state: { colon?: Colon; recipe?: string },
  ) {
    if (!state.colon) {
      return (
        <>
          <p>Pick a new recicpe for...</p>
          <ItemList limit={30} onPick={(colon) => this.setState({ colon })} />
        </>
      );
    }
    const bad = (recp: JRecipe): number =>
      recp.products.length +
      recp.ingredients.map((ing) => ing.amount).reduce((a, b) => a + b, 0) +
      recp.time / 10;

    return (
      <>
        Picking a recipe for{' '}
        <button
          class="btn btn-sm"
          onClick={() => this.setState({ colon: undefined })}
        >
          ❌️
        </button>
        <ColonJoined colon={state.colon} />
        <table class={'table'}>
          <tbody>
            {Object.entries(data.recipes.regular)
              .filter(
                ([recipe, recp]) =>
                  undefined !==
                  recp.products.find((prod) => prod.colon === state.colon),
              )
              .sort(([, a], [, b]) => bad(a) - bad(b))
              .map(([recipe, recp]) => (
                <tr>
                  <td>
                    <button
                      class="btn btn-sm"
                      onClick={() => this.props.puck(recipe)}
                    >
                      ➕
                    </button>
                  </td>
                  <td>
                    {recp.localised_name}{' '}
                    <span class={'text-muted'}>{recipe}</span>
                  </td>
                  <td>{recp.time}</td>
                  <td>
                    {recp.ingredients.map((ing) => {
                      const [, item] = fromColon(ing.colon);
                      return (
                        <>
                          {humanise(ing.amount)}
                          <ItemIcon
                            name={splitColon(ing.colon)[1]}
                            alt={item.localised_name}
                          />
                        </>
                      );
                    })}
                  </td>
                  <td>
                    {recp.products.map((prod) => {
                      const [, item] = fromColon(prod.colon);
                      return (
                        <>
                          {humanise(productAsFloat(prod))}
                          <ItemIcon
                            name={splitColon(prod.colon)[1]}
                            alt={item.localised_name}
                          />
                        </>
                      );
                    })}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </>
    );
  }
}
