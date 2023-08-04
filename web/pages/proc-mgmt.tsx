import { Component } from 'preact';

import { pack, unpack, useLib } from '../muffler/libs';
import { route } from 'preact-router';
import { effectsOf, jobsEffects, PickRecipe } from './plan';
import { Colon } from '../muffler/colon';
import {
  buildMaking,
  makeUpRecipe,
  RecipeName,
  recipeSummary,
} from '../muffler/walk-recipes';
import { Factory, FactoryClass } from '../datae';
import { ColonJoined } from '../objects';
import { BuildTime } from '../components/how-to-make';
import { ActionPill } from './block';

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

    const summary = (
      <div class={'row'}>
        <div class={'col'}>
          <h2>Imports</h2>
          <ul>
            {[...imports].map((colon) => (
              <li>
                {effects[colon]} <ColonJoined colon={colon} />
              </li>
            ))}
          </ul>
        </div>
        <div class={'col'}>
          <h2>Exports</h2>
          <table>
            <tbody>
              {[...exports].map((colon) => (
                <tr>
                  <td>
                    <input
                      class={'form-control'}
                      type={'number'}
                      min={0}
                      size={4}
                      style={'width: 5em'}
                      value={props.manifest.requirements?.[colon] ?? 0}
                      onChange={(e: any) => {
                        const val = parseInt(e.target.value);
                        if (!val) {
                          delete props.manifest.requirements?.[colon];
                        } else {
                          props.manifest.requirements =
                            props.manifest.requirements || {};
                          props.manifest.requirements[colon] = val;
                        }
                        props.setManifest(props.manifest);
                      }}
                    />
                  </td>
                  <td>
                    <ColonJoined colon={colon} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );

    // const missing = new Set([...inputs].filter((input) => !outputs.has(input)));
    // Object.keys(props.manifest.explicitImports ?? {}).forEach((colon) => missing.delete(colon));

    const waysToMake = buildMaking();
    const fixes = Object.entries(effects)
      .filter(([colon, effect]) => effect < 0)
      .sort(([, a], [, b]) => a - b)
      .map(([colon]) => {
        const candidates = waysToMake[colon];
        return candidates.map((recipeName) => {
          const recp = makeUpRecipe(recipeName)!;

          return (
            <tr>
              <td>
                <button
                  class={'btn btn-sm btn-success'}
                  onClick={() => {
                    props.manifest.recipes = props.manifest.recipes || {};
                    props.manifest.recipes[recipeName] = {
                      craftingSpeed: 1,
                    };
                    props.setManifest(props.manifest);
                  }}
                  title={'Add recipe'}
                >
                  ✅️
                </button>
              </td>
              <td>
                {recp.localised_name} (
                <span class={'text-muted'}>{recipeName}</span>)
              </td>
              <td>
                <ActionPill action={effectsOf(recp, 1)} />
              </td>
            </tr>
          );
        });
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

    return (
      <>
        {summary}
        <table class={'table'}>
          <thead>
            <tr>
              <th></th>
              <th>Recipe</th>
              <th>
                <abbr title={'Computed assemblers'}>Asms</abbr>
              </th>
              <th>Speed</th>
              <th>Effect</th>
            </tr>
          </thead>
          <tbody>{recipeRows}</tbody>
        </table>
        <table>
          <tbody>{fixes}</tbody>
        </table>
        <PickRecipe
          colon={state.recipeColon}
          setColon={(recipeColon) => this.setState({ recipeColon })}
          puck={(recipe) => {
            props.manifest.recipes = props.manifest.recipes || {};
            props.manifest.recipes[recipe] = {
              craftingSpeed: 1,
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
