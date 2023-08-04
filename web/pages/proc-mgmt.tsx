import { Component } from 'preact';

import { pack, unpack, useLib } from '../muffler/libs';
import { route } from 'preact-router';
import {
  effectsOf,
  jobsEffects,
  NumberTableRow,
  PickRecipe,
  typicalClassSpeed,
} from './plan';
import { Colon, fromColon } from '../muffler/colon';
import {
  buildConsuming,
  buildMaking,
  makeUpRecipe,
  RecipeName,
  recipeSummary,
} from '../muffler/walk-recipes';
import { Factory, FactoryClass } from '../datae';
import { ColonJoined, JRecipe } from '../objects';
import { BuildTime } from '../components/how-to-make';
import { Action, ActionPill } from './block';
import { humanise } from '../muffler/human';

const US = '/an/proc-mgmt/';

interface Manifest {
  requirements?: Record<Colon, number>;
  explicitImports?: Record<Colon, {}>;
  explicitExports?: Record<Colon, {}>;
  recipes?: Record<RecipeName, { craftingSpeed: number }>;
  factories?: Record<
    FactoryClass,
    {
      factory: Factory;
      speed: number;
    }
  >;
}

interface ProcMgmtProps {
  manifest: Manifest;
  setManifest: (manifest: Manifest) => void;
}

interface ProcMgmtState {
  recipeColon: Colon;
}

export class ProcMgmt extends Component<ProcMgmtProps, ProcMgmtState> {
  render(props: ProcMgmtProps, state: ProcMgmtState) {
    const [mgmtErr, mgmt] = useLib('process-mgmt');
    if (mgmtErr) return mgmtErr;

    const { inputs, outputs } = recipeSummary(
      Object.keys(props.manifest.recipes ?? {}),
    );

    const imports = new Set([...inputs].filter((input) => !outputs.has(input)));
    Object.keys(props.manifest.explicitImports ?? {}).forEach((colon) =>
      imports.add(colon),
    );
    Object.keys(props.manifest.requirements ?? {}).forEach((colon) =>
      imports.delete(colon),
    );
    Object.keys(props.manifest.explicitExports ?? {}).forEach((colon) =>
      imports.delete(colon),
    );

    const exports = new Set(
      [...outputs].filter(
        (output) => !inputs.has(output) && !imports.has(output),
      ),
    );
    Object.keys(props.manifest.explicitExports ?? {}).forEach((colon) =>
      exports.add(colon),
    );
    Object.keys(props.manifest.requirements ?? {}).forEach((colon) =>
      exports.delete(colon),
    );

    try {
      var { recipeCounts } = mgmt.runSomething({
        requirements: props.manifest.requirements ?? {},
        imports: [...imports],
        exports: [...exports],
        recipes: props.manifest.recipes ?? {},
      });
    } catch (err) {
      console.error(err);
    }

    Object.keys(props.manifest.requirements ?? {}).forEach((colon) =>
      exports.add(colon),
    );

    const effects = jobsEffects(
      Object.entries(props.manifest.recipes ?? {}).map(([recipe, obj]) => ({
        recipe,
        count: recipeCounts?.[recipe] ?? 0,
        craftingSpeed: obj.craftingSpeed,
      })),
    );

    const exportSort = (a: Colon, b: Colon) => {
      const explict = (colon: Colon) => !!props.manifest.requirements?.[colon];
      if (explict(a) && explict(b)) {
        return fromColon(a)[1].localised_name.localeCompare(
          fromColon(b)[1].localised_name,
        );
      }
      if (explict(a)) return -1;
      if (explict(b)) return 1;
      return effects[a] - effects[b];
    };

    const summary = (
      <div class={'row'}>
        <div class={'col'}>
          <h2>Imports</h2>
          <table
            className={'plan-number-table'}
            style={{ width: 'auto', minWidth: '20em' }}
          >
            <tbody>
              {[...imports]
                .sort((a, b) => effects[a] - effects[b])
                .map((colon) => (
                  <NumberTableRow colon={colon} amount={-effects[colon]} />
                ))}
            </tbody>
          </table>
        </div>
        <div class={'col'}>
          <h2>Exports</h2>
          {Object.values(props.manifest.requirements ?? {}).some(
            (req) => req > 0,
          ) || (
            <div class={'alert alert-warning'}>
              Choose at least one required amount of output, by entering a
              number here, or everything will compute as zero.
            </div>
          )}
          <table>
            <tbody>
              {[...exports].sort(exportSort).map((colon) => {
                const extraStyle =
                  props.manifest.requirements?.[colon] !== undefined
                    ? { 'font-weight': 'bold' }
                    : { 'font-style': 'italic' };
                const onChange = (e: any) => {
                  const val = parseFloat(e.target.value);
                  if (!val) {
                    delete props.manifest.requirements?.[colon];
                  } else {
                    props.manifest.requirements =
                      props.manifest.requirements || {};
                    props.manifest.requirements[colon] = val;
                  }
                  props.setManifest(props.manifest);
                };
                return (
                  <tr>
                    <td>
                      <input
                        class={'form-control'}
                        type={'number'}
                        min={0}
                        step={'any'}
                        size={4}
                        style={{
                          width: '5em',
                          'text-align': 'right',
                          ...extraStyle,
                        }}
                        value={props.manifest.requirements?.[colon] ?? ''}
                        placeholder={effects[colon]?.toFixed(1) ?? '??'}
                        onChange={onChange}
                      />
                    </td>
                    <td>
                      <ColonJoined colon={colon} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <hr/>
          <button class={'btn btn-danger'} onClick={() => {
            delete props.manifest.requirements;
            delete props.manifest.explicitImports;
            delete props.manifest.explicitExports;
            props.setManifest(props.manifest);
          }}>
            Clear all customisations
          </button>
        </div>
      </div>
    );

    const waysToMake = buildMaking();
    const waysToConsume = buildConsuming();

    const fixes = Object.entries(effects)
      .filter(
        ([colon]) =>
          props.manifest.requirements?.[colon] === undefined &&
          props.manifest.explicitImports?.[colon] === undefined &&
          props.manifest.explicitExports?.[colon] === undefined,
      )
      .filter(([, effect]) => Math.abs(effect) > 1e-5)
      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
      .slice(0, 6)
      .map(([colon]) => {
        const missing = effects[colon] < 0;
        const candidates = missing
          ? waysToMake[colon] ?? []
          : waysToConsume[colon] ?? [];
        const total = candidates.length;

        const recipeBlobs = candidates
          .sort(
            (a, b) =>
              recipeScore(makeUpRecipe(b)!, effects) -
              recipeScore(makeUpRecipe(a)!, effects),
          )
          .slice(0, 6)
          .map((recipeName) => {
            const recp = makeUpRecipe(recipeName)!;

            return (
              <>
                <td>
                  <button
                    class={'btn btn-sm btn-success'}
                    onClick={() => {
                      props.manifest.recipes = props.manifest.recipes || {};
                      props.manifest.recipes[recipeName] = {
                        craftingSpeed: typicalClassSpeed(recp.producerClass),
                      };
                      props.setManifest(props.manifest);
                    }}
                    title={'Add recipe'}
                  >
                    ➕
                  </button>
                </td>
                <td>
                  {recp.localised_name} (
                  <span class={'text-muted'}>{recipeName}</span>)
                </td>
                <td>
                  <ActionPill action={effectsOf(recp, 1 / recp.time)} />
                </td>
              </>
            );
          });

        const count = recipeBlobs.length;
        const item = (
          <td rowSpan={count}>
            <p>
              {missing ? 'Missing' : 'Surplus'}{' '}
              {humanise((missing ? -1 : 1) * effects[colon])} &times;{' '}
              <ColonJoined colon={colon} />
            </p>
            {count !== total && (
              <p>
                Showing top {count}/{total} recipes.
              </p>
            )}
            {missing && (
            <button
              class={'btn btn-sm btn-info'}
              onClick={() => {
                props.manifest.explicitImports =
                  props.manifest.explicitImports || {};
                props.manifest.explicitImports[colon] = {};
                props.setManifest(props.manifest);
              }}
            >
              Mark as explicit import
            </button>)}
          </td>
        );

        return recipeBlobs.map((blob, i) => (
          <tr>
            {i === 0 && item}
            {blob}
          </tr>
        ));
      });

    const recipeRows = Object.entries(props.manifest.recipes || {}).map(
      ([recipeName, obj]) => {
        const recp = makeUpRecipe(recipeName)!;
        return (
          <tr>
            <td>
              <button
                class={'btn btn-sm btn-danger'}
                onClick={() => {
                  delete props.manifest.recipes?.[recipeName];
                  props.setManifest(props.manifest);
                }}
                title={'Delete recipe'}
              >
                ❌️
              </button>
            </td>
            <td>
              {recp.localised_name} (
              <span class={'text-muted'}>{recipeName}</span>)
            </td>
            <td>{(recipeCounts?.[recipeName] ?? 0).toFixed(1)}</td>
            <td>
              <BuildTime
                speedsNotTimes={true}
                highlight={obj.craftingSpeed}
                recipe={recp}
                onClick={(newSpeed) => {
                  props.manifest.recipes![recipeName].craftingSpeed = newSpeed;
                  props.setManifest(props.manifest);
                }}
              />
            </td>
            <td>
              <ActionPill
                action={effectsOf(
                  recp,
                  (obj.craftingSpeed * (recipeCounts?.[recipeName] ?? 1)) /
                    recp.time,
                )}
              />
            </td>
          </tr>
        );
      },
    );

    const mainPage = Object.keys(props.manifest.recipes ?? {}).length ? (
      <>
        {summary}
        <div class={'row'}>
          <h2>Current recipes, computed counts, and speeds</h2>
          <table class={'table'}>
            <thead>
              <tr>
                <th colSpan={2}>Recipe</th>
                <th>
                  <abbr title={'Computed assemblers'}>Asms</abbr>
                </th>
                <th>Speed</th>
                <th>Effect</th>
              </tr>
            </thead>
            <tbody>{recipeRows}</tbody>
          </table>
        </div>
        {!!fixes.length && (
          <div class={'row'}>
            <h2>Proposed fixes</h2>
            <table class={'table'}>
              <thead>
                <tr>
                  <th>Problem</th>
                  <th />
                  <th>Recipe</th>
                  <th>Effect</th>
                </tr>
              </thead>
              <tbody>{fixes}</tbody>
            </table>
          </div>
        )}
      </>
    ) : (
      <div class={'row'}>
        <h2>Let's manage a process</h2>
        <p>First up, let's pick a recipe based on a target item.</p>
      </div>
    );

    return (
      <>
        {mainPage}
        <PickRecipe
          colon={state.recipeColon}
          setColon={(recipeColon) => this.setState({ recipeColon })}
          puck={(recipe) => {
            props.manifest.recipes = props.manifest.recipes || {};
            props.manifest.recipes[recipe] = {
              craftingSpeed: typicalClassSpeed(
                makeUpRecipe(recipe)!.producerClass,
              ),
            };
            this.setState({ recipeColon: undefined });
            props.setManifest(props.manifest);
          }}
        />
      </>
    );
  }
}

export class ProcMgmtPage extends Component<{ encoded?: string }> {
  render(props: { encoded?: string }) {
    const [brotliErr, brotli] = useLib('brotli-wasm');
    if (brotliErr) return brotliErr;
    const manifest = props.encoded
      ? (unpack(props.encoded, brotli) as Manifest)
      : {};

    return (
      <ProcMgmt
        manifest={manifest}
        setManifest={(manifest: Manifest) =>
          route(`${US}${pack(manifest, brotli)}`)
        }
      />
    );
  }
}

function recipeScore(recp: JRecipe, globalEffect: Action): number {
  const E = 1e-5;

  // TODO: typical speed?
  const oneAssembler = effectsOf(recp, 1 / recp.time);

  let score = 0;
  for (const ing of recp.ingredients) {
    const effect = globalEffect[ing.colon];
    if (effect === undefined) {
      // needs something we don't have
      score -= 100;
    } else if (effect > E) {
      score += 50 - effect / oneAssembler[ing.colon];
    } else {
      score += 10;
    }
  }

  for (const prod of recp.products) {
    const effect = globalEffect[prod.colon];
    if (effect === undefined) {
      score -= 100;
    } else if (effect < -E) {
      score += 50 + effect / oneAssembler[prod.colon];
    } else {
      score += 10;
    }
  }

  return score;
}
