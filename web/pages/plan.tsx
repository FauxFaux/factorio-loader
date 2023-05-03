import { Component } from 'preact';
import type { BrotliWasmType } from 'brotli-wasm';
import { useEffect } from 'preact/hooks';
import * as base64 from '@protobufjs/base64';

import {
  limitations,
  makeUpRecipe,
  productAsFloat,
  RecipeName,
} from '../muffler/walk-recipes';
import { data } from '../datae';
import { ColonJoined, JRecipe } from '../objects';
import { Colon, fromColon, splitColon } from '../muffler/colon';
import { humanise } from '../muffler/human';
import { route } from 'preact-router';
import { ItemIcon, ItemList } from '../lists';
import { stackSize } from './chestify';
import { decode, stripProducer } from '../muffler/blueprints';
import { BuildTime, factoryFriendlyName } from '../components/how-to-make';

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
  blueprintIn?: string;
}

function typicalSpeed(name: string) {
  const clazz = stripProducer(name);
  const factory = data.meta.factories[clazz]?.[name];
  const speed = factory?.speed;
  if (speed === undefined) return 0.001;
  const limit = limitations[clazz];
  if (!limit) return speed;
  const modules = data.meta.modules[limit];
  return (1 + (Object.values(modules)?.[0] ?? 0)) * speed;
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
      const recp = makeRecipe(job);
      const scale = (job.count * job.craftingSpeed) / recp.time;
      for (const ing of recp.ingredients) {
        effects[ing.colon] = (effects[ing.colon] || 0) - ing.amount * scale;
      }
      for (const prod of recp.products) {
        effects[prod.colon] =
          (effects[prod.colon] || 0) + productAsFloat(prod) * scale;
      }
    }

    const NumberTableRow = ({
      colon,
      amount,
    }: {
      colon: Colon;
      amount: number;
    }) => {
      // 50: typical LTN load
      const fullTrain = stackSize(colon) * 50;
      const filterInserterSpeed = 4.62; // items per second
      const hour = 60 * 60;
      const maxTrainsPerHour = hour / (fullTrain / (8 * filterInserterSpeed));
      const tph = (amount * hour) / fullTrain;
      return (
        <tr>
          <td style={'text-align: right'}>{humanise(amount)} &times;</td>
          <td>
            <ColonJoined colon={colon} />
          </td>
          <td
            style={'text-align: right'}
            class={
              tph > 15
                ? 'plan-number-table--naughty'
                : tph > maxTrainsPerHour
                ? 'plan-number-table--risky'
                : ''
            }
          >
            {tph.toFixed(1)}
            <abbr title={'trains per hour, at 50 stacks (barrelled)'}>tph</abbr>
          </td>
        </tr>
      );
    };

    const effectsSection = (
      <div class={'row'}>
        <div class={'col plan-table-col'}>
          <h3>Surplus</h3>
          <table class={'plan-number-table'}>
            <tbody>
              {Object.entries(effects)
                .sort(([, a], [, b]) => b - a)
                .filter(([, amount]) => amount > 1e-4)
                .map(([colon, amount]) => (
                  <NumberTableRow colon={colon} amount={amount} />
                ))}
            </tbody>
          </table>
        </div>
        <div className={'col'}>
          <h3>Missing</h3>
          <table className={'plan-number-table'}>
            <tbody>
              {Object.entries(effects)
                .sort(([, a], [, b]) => b - a)
                .filter(([, amount]) => amount < -1e-4)
                .map(([colon, amount]) => (
                  <NumberTableRow colon={colon} amount={-amount} />
                ))}
            </tbody>
          </table>
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
          <div class={'col'}>
            <input
              type={'text'}
              style="width: 5em; display: revert; margin: 2px"
              class={'form-control'}
              onChange={(e) => {
                this.setState({ blueprintIn: (e.target as any)?.value });
              }}
            />
            <button
              className={'btn btn-primary'}
              onClick={() => this.loadBlueprint()}
            >
              Load from blueprint
            </button>
          </div>
        </div>
        {effectsSection}
        <div class={'row'}>
          <div class={'col'}>
            <ManifestTable
              manifest={state.manifest}
              effects={effects}
              onChange={(manifest) => this.setState({ manifest })}
            />
          </div>
        </div>
      </>
    );
  }

  loadBlueprint() {
    const blueprint = this.state.blueprintIn;
    if (!blueprint) {
      return;
    }
    const manifest: Manifest = {
      jobs: [],
    };
    const countByLabel: Record<string, number> = {};
    const decoded = decode(blueprint);
    for (const entity of decoded.entities ?? []) {
      if (!entity.recipe) continue;
      if (!data.recipes.regular[entity.recipe]) continue;
      const label = `${entity.name}\0${entity.recipe}`;
      countByLabel[label] = (countByLabel[label] || 0) + 1;
    }
    for (const [label, count] of Object.entries(countByLabel)) {
      const [name, recipe] = label.split('\0');
      manifest.jobs.push({
        recipe,
        count,
        craftingSpeed: typicalSpeed(name),
      });
    }
    this.setState({ manifest });
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
  effects: Record<Colon, number>;
}

interface ManifestState {
  manifest: Manifest;
}

function makeRecipe(job: Job): JRecipe {
  if (job.recipe === 'boiler:biomass') {
    return {
      time: 1,
      ingredients: [
        {
          colon: 'fluid:water',
          amount: 60,
        },
        {
          colon: 'item:biomass',
          // 1.8MW (https://wiki.factorio.com/Boiler) / 1MJ
          amount: 1.8,
        },
      ],
      products: [
        {
          colon: 'fluid:steam',
          amount: 60,
          temperature: 165,
        },
      ],
      producerClass: 'boiler',
      localised_name: 'Boiler consuming biomass (fake)',
      category: 'fake',
      unlocked_from_start: true,
    };
  }
  const recp = makeUpRecipe(job.recipe);
  if (!recp) throw new Error(`Unknown recipe ${job.recipe}`);
  return recp;
}

function colourAmount(effect: number | undefined, actual: number) {
  const colours = ['#8a0605', '#ab4230', '#e7dbcd', '#918f63', '#71b27e'];

  const eff = effect ?? 0;
  const err = eff / actual;
  const pick = () => {
    if (err < -0.8) return colours[0];
    if (err < -0.02) return colours[1];
    // -2% to +10% is the middle band, yellow
    if (err < 0.1) return colours[2];
    if (err < 0.8) return colours[3];
    return colours[4];
  };

  return (
    <span style={`color: ${pick()}`} class={'amount'}>
      {humanise(actual)}
    </span>
  );
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
            const recp = makeRecipe(job);
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
                    (<span class={'font-monospace'}>{job.recipe}</span> in{' '}
                    {factoryFriendlyName(recp.producerClass)})<br />
                    <BuildTime
                      recipe={recp}
                      speedsNotTimes={true}
                      onClick={(speed) => {
                        job.craftingSpeed = speed;
                        this.setState({ manifest });
                        this.props.onChange(manifest);
                      }}
                    />
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
                  <ul style={'list-style-type: none; padding: 0; margin: 0'}>
                    {makeRecipe(job).ingredients.map((ing) => (
                      <li>
                        {colourAmount(
                          props.effects[ing.colon],
                          ing.amount * scale,
                        )}{' '}
                        &times; <ColonJoined colon={ing.colon} />
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  <ul style={'list-style-type: none; padding: 0; margin: 0'}>
                    {makeRecipe(job).products.map((prod) => (
                      <li>
                        {colourAmount(
                          props.effects[prod.colon],
                          productAsFloat(prod) * scale,
                        )}{' '}
                        &times; <ColonJoined colon={prod.colon} />
                      </li>
                    ))}
                  </ul>
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
        <hr />
        <button
          class={'btn btn-primary'}
          onClick={() => {
            manifest.jobs.push({
              recipe: 'boiler:biomass',
              craftingSpeed: 1,
              count: 1,
            });
            this.setState({ manifest });
            this.props.onChange(manifest);
          }}
        >
          Add boiler (biomass)
        </button>
        <hr style={'margin-top: 60em'} />
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
