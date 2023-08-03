import { Component, createRef } from 'preact';
import * as base64 from '@protobufjs/base64';
import _cloneDeep from 'lodash.clonedeep';

import {
  limitations,
  makeUpRecipe,
  productAsFloat,
  RecipeName,
} from '../muffler/walk-recipes';
import { data, Factory, FactoryClass } from '../datae';
import { ColonJoined, JRecipe } from '../objects';
import { Colon, fromColon, splitColon } from '../muffler/colon';
import { humanise } from '../muffler/human';
import { route } from 'preact-router';
import { ItemIcon, ItemList } from '../lists';
import { stackSize } from './chestify';
import { decode, stripProducer } from '../muffler/blueprints';
import { BuildTime, factoryFriendlyName } from '../components/how-to-make';
import { pack, unpack, useLib } from '../muffler/libs';

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
  manifest: Manifest;
}

export function actualSpeed(name: Factory, modules: Record<string, number>) {
  const clazz = stripProducer(name);
  const factory = data.meta.factories[clazz]?.[name];
  let speed = factory?.speed;
  if (speed === undefined) return 0.001;
  const limit = limitations[clazz];
  if (!limit) return speed;
  const module = data.meta.modules[limit];
  for (const [mod, count] of Object.entries(modules)) {
    const effect = module[mod];
    speed *= 1 + effect * count;
  }
  return Math.round(speed * 1000) / 1000;
}

export function effectsOf(
  recp: JRecipe,
  scale: number,
  effects: Record<string, number> = {},
) {
  for (const ing of recp.ingredients) {
    effects[ing.colon] = (effects[ing.colon] || 0) - ing.amount * scale;
  }
  for (const prod of recp.products) {
    effects[prod.colon] =
      (effects[prod.colon] || 0) + productAsFloat(prod) * scale;
  }
  return effects;
}

export function jobsEffects(jobs: Job[]) {
  const effects: Record<Colon, number> = {};
  for (const job of jobs) {
    const recp = makeRecipe(job);
    const scale = (job.count * job.craftingSpeed) / recp.time;
    effectsOf(recp, scale, effects);
  }
  return effects;
}

export class Plan extends Component<{ encoded?: string }, PlanState> {
  render(props: { encoded?: string }, state: PlanState) {
    const [brotliErr, brotli] = useLib('brotli-wasm');
    if (brotliErr) return brotliErr;
    if (!state.manifest) {
      const manifest = props.encoded
        ? (unpack(props.encoded, brotli) as Manifest)
        : {
            jobs: [],
          };
      this.setState({ manifest });
      return <div>Too lazy to fix the flow control...</div>;
    }

    const effects = jobsEffects(state.manifest.jobs);
    const area = areaGuess(state.manifest.jobs);

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
          <h3>
            Missing (
            <a
              style={{ cursor: 'pointer' }}
              onClick={() => {
                const next = balance(state.manifest);
                this.setState({ manifest: next });
              }}
            >
              ⚖️
            </a>
            )
          </h3>
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

    const andleTb = new TextEncoder().encode(
      JSON.stringify(packandle(state.manifest)),
    );
    const andleB64 = base64.encode(andleTb, 0, andleTb.length);
    const procMgmt = `https://proc.candle.me.uk/#${andleB64}`;

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
            <h3>
              Estimated fill:{' '}
              <abbr
                title={`~${area.toLocaleString()} tiles of ~12k recommended max`}
              >
                {((area / 12000) * 100).toFixed()}%
              </abbr>
            </h3>
          </div>
          <div class={'col'}>
            <a target={'_blank'} href={procMgmt}>
              view in procmgmt
            </a>
          </div>
          <div class={'col'}>
            <button
              className={'btn btn-primary'}
              onClick={() => this.loadBlueprint()}
            >
              Load blueprint from clipboard
            </button>
          </div>
        </div>
        {effectsSection}
        <div class={'row'}>
          <div class={'col'}>
            <ManifestTable
              manifest={state.manifest}
              effects={effects}
              onChange={(manifest) =>
                this.setState({
                  manifest: {
                    jobs: [...manifest.jobs],
                  },
                })
              }
            />
          </div>
        </div>
      </>
    );
  }

  async loadBlueprint() {
    const blueprint = await navigator.clipboard.readText();
    if (!blueprint) {
      return;
    }
    const manifest: Manifest = {
      jobs: [],
    };
    const decoded = decode(blueprint);
    const recognised: [RecipeName, number][] = [];
    for (const entity of decoded.entities ?? []) {
      if (!entity.recipe) continue;
      if (!makeUpRecipe(entity.recipe)) continue;
      const speed = actualSpeed(entity.name, entity.items ?? {});
      recognised.push([entity.recipe, speed]);
    }

    for (const [recipe, craftingSpeed] of recognised) {
      const job = manifest.jobs.find(
        (job) => job.recipe === recipe && job.craftingSpeed === craftingSpeed,
      );
      if (job) {
        job.count += 1;
      } else {
        manifest.jobs.push({
          recipe,
          count: 1,
          craftingSpeed,
        });
      }
    }
    this.setState({ manifest });
  }
}

interface ManifestTableProps {
  manifest: Manifest;
  onChange: (manifest: Manifest) => void;
  effects: Record<Colon, number>;
}

interface ManifestState {
  recipeColon?: Colon;
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
  pickRecipe = createRef();
  lastRow = createRef();

  render(props: ManifestTableProps, state: ManifestState) {
    const manifest = props.manifest;

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
          {manifest.jobs.map((job, i) => {
            const recp = makeRecipe(job);
            const scale = (job.count * job.craftingSpeed) / recp.time;
            return (
              <tr ref={this.lastRow}>
                <td>
                  <button
                    class={'btn btn-sm btn-danger'}
                    onClick={() => {
                      const jobs = [...manifest.jobs];
                      jobs.splice(i, 1);
                      this.props.onChange({ jobs });
                    }}
                    title={'Remove job'}
                  >
                    ❌️
                  </button>
                </td>
                <td>
                  {recp.localised_name}{' '}
                  <span class={'text-muted'} style={'font-size: 70%'}>
                    (<span class={'font-monospace'}>{job.recipe}</span> in{' '}
                    {factoryFriendlyName(recp.producerClass)})
                  </span>
                  <br />
                  <BuildTime
                    recipe={recp}
                    speedsNotTimes={true}
                    onClick={(speed) => {
                      // FLOATS
                      job.craftingSpeed = Math.round(speed * 1000) / 1000;
                      this.props.onChange(manifest);
                    }}
                  />
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
                      this.props.onChange(manifest);
                    }}
                  />
                </td>
                <td>
                  <ul style={'list-style-type: none; padding: 0; margin: 0'}>
                    {makeRecipe(job).ingredients.map((ing) => (
                      <li>
                        <a
                          title={'find a producer'}
                          style={'cursor: pointer'}
                          onClick={() => {
                            this.setState({ recipeColon: ing.colon });
                            this.pickRecipe.current?.scrollIntoView();
                          }}
                        >
                          +
                        </a>
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
        <hr ref={this.pickRecipe} />
        <PickRecipe
          setColon={(colon) => {
            this.setState({ recipeColon: colon });
          }}
          colon={state.recipeColon}
          puck={(recipe) => {
            this.setState({ recipeColon: undefined });
            props.onChange({
              jobs: [
                ...manifest.jobs,
                {
                  recipe,
                  craftingSpeed: 1,
                  count: 1,
                },
              ],
            });
            this.lastRow.current?.scrollIntoView();
          }}
        />
        <hr />
        <button
          class={'btn btn-primary'}
          onClick={() => {
            props.onChange({
              jobs: [
                ...manifest.jobs,
                {
                  recipe: 'boiler:biomass',
                  craftingSpeed: 1,
                  count: 1,
                },
              ],
            });
          }}
        >
          Add boiler (biomass)
        </button>
        <hr style={'margin-top: 60em'} />
      </>
    );
  }
}

interface PickRecipeProps {
  setColon: (colon: Colon | undefined) => void;
  puck: (recipe: string) => void;
  colon?: Colon;
}

export class PickRecipe extends Component<PickRecipeProps> {
  onChange = (e: Event) => {
    const recipe = (e.target as HTMLInputElement).value;
    this.setState({ recipe });
    this.props.puck(recipe);
  };

  render(props: PickRecipeProps) {
    if (!props.colon) {
      return (
        <>
          <p>Pick a new recipe for...</p>
          <ItemList limit={30} onPick={(colon) => props.setColon(colon)} />
        </>
      );
    }
    const bad = (recp: JRecipe): number =>
      recp.products.length +
      recp.ingredients.map((ing) => ing.amount).reduce((a, b) => a + b, 0) +
      // mostly only relevant for AL animals, which have huge times
      recp.time / 100;

    return (
      <>
        Picking a recipe for{' '}
        <button class="btn btn-sm" onClick={() => props.setColon(undefined)}>
          ❌️
        </button>
        <ColonJoined colon={props.colon} />
        <table class={'table'}>
          <tbody>
            {Object.entries(data.recipes.regular)
              .filter(
                ([recipe, recp]) =>
                  undefined !==
                  recp.products.find((prod) => prod.colon === props.colon),
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

function balance(manifest: Manifest): Manifest {
  const jobs = _cloneDeep(manifest.jobs);

  const effects = jobs.map((job, i) => {
    const recp = makeRecipe(job);
    const scale = job.craftingSpeed / recp.time;
    return effectsOf(recp, scale);
  });

  const canIncrease = effects.flatMap((effect) =>
    Object.entries(effect)
      .filter(([, n]) => n > 0)
      .map(([colon]) => colon),
  );

  for (let i = 0; i < 300; ++i) {
    const current = jobsEffects(jobs);
    let worked = false;
    for (const [colon, score] of Object.entries(current)) {
      if (score < 0 && canIncrease.includes(colon)) {
        const found = effects.findIndex((effect) => effect[colon] > 0);
        if (found === -1) continue;
        jobs[found].count += 1;
        worked = true;
        break;
      }
    }
    if (!worked) {
      return {
        jobs,
      };
    }
  }

  throw new Error('Failed to converge');
}

function areaGuess(jobs: Job[]) {
  let area = 0;
  for (const job of jobs) {
    const recp = makeRecipe(job);
    const clazz = recp.producerClass;
    let [w, h] = Object.values(data.meta.factories[clazz])[0].dims;
    if (h < w) {
      [w, h] = [h, w];
    }
    const lanes = recp.ingredients.length + recp.products.length;
    h += Math.min(lanes, 3);
    w += Math.max(lanes - 3, 0);
    area += w * h * job.count;
  }
  return area;
}

type ItemName = string;

type AndleFactoryClass = FactoryClass;

interface Andle {
  v: 1;
  game_id: 'factorio-py-1.1.53';
  // q: quantity per second
  requirements: { id: ItemName; q: number }[];
  imports: ItemName[];
  exports: ItemName[];
  processes: RecipeName[];
  default_factory_groups: Record<AndleFactoryClass, Factory>;
  process_modifiers: {};
}

function packandle(manifest: Manifest): Andle {
  const wanted = new Set<ItemName>();
  const produced = new Set<ItemName>();

  const idOf = (colon: Colon) => splitColon(colon)[1];

  const effects = jobsEffects(manifest.jobs);

  for (const job of manifest.jobs) {
    const recp = makeRecipe(job);
    for (const prod of recp.ingredients) {
      wanted.add(idOf(prod.colon));
    }
    for (const ing of recp.products) {
      produced.add(idOf(ing.colon));
    }
  }

  const requirements: Andle['requirements'] = [];
  if (manifest.jobs[0]) {
    for (const prod of makeUpRecipe(manifest.jobs[0].recipe)?.products ?? []) {
      const id = idOf(prod.colon);
      produced.delete(id);
      // TODO: fluids?
      requirements.push({
        id,
        q: effects[prod.colon] ?? 0,
      });
    }
  }

  const imports = [...wanted].filter((item) => !produced.has(item));
  const exports = [...produced].filter((item) => !wanted.has(item));

  return {
    v: 1,
    game_id: 'factorio-py-1.1.53',
    requirements,
    imports,
    exports,
    processes: manifest.jobs.map((job) => job.recipe),
    default_factory_groups: {},
    process_modifiers: {},
  };
}
