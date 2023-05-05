import { cloneDeep } from 'lodash';
import { Colon, fromColon, splitColon } from '../muffler/colon';
import { Component } from 'preact';
import { data } from '../datae';
import { IngProd } from '../components/how-to-make';
import { stepsToUnlockRecipe } from './next';
import { ColonJoined, JProduct, JRecipe } from '../objects';
import { productAsFloat } from '../muffler/walk-recipes';
import * as bp from '../muffler/blueprints';
import { buildRequestFilters } from '../muffler/blueprints';

interface Filters {
  buildings: boolean;
  multipleInputs: boolean;
  multipleOutputs: boolean;
}

export function isBuilding(colon: Colon) {
  if (['item:concrete-wall'].includes(colon)) return true;
  const [kind, obj] = fromColon(colon);
  if (kind !== 'item') return false;
  return (
    obj.subgroup.name.includes('-buildings-') || // e.g. crystal mine
    obj.subgroup.name === 'py-rawores-mines' || // e.g. aluminium mine
    obj.subgroup.name === 'py-extraction' ||
    obj.subgroup.name === 'py-power'
  );
}

function buildingRecipe(products: JProduct[]) {
  return (
    products.length === 1 &&
    productAsFloat(products[0]) === 1 &&
    isBuilding(products[0].colon)
  );
}

export class Consumes extends Component<{ colon: Colon }, Filters> {
  state = {
    buildings: false,
    multipleInputs: true,
    multipleOutputs: true,
  };

  render(props: { colon: Colon }, state: Filters) {
    const consumesThis = Object.entries(data.recipes.regular).filter(
      ([, { ingredients }]) =>
        !!ingredients.find((p) => p.colon === props.colon),
    );

    let excluded = {
      buildings: 0,
      multipleInputs: 0,
      multipleOutputs: 0,
    };

    const consumesObj = Object.fromEntries(consumesThis);
    for (const [name, { ingredients, products }] of Object.entries(
      consumesObj,
    )) {
      if (!state.buildings && buildingRecipe(products)) {
        excluded.buildings++;
        delete consumesObj[name];
        continue;
      }
      if (!state.multipleInputs && ingredients.length !== 1) {
        excluded.multipleInputs++;
        delete consumesObj[name];
        continue;
      }
      if (!state.multipleOutputs && products.length !== 1) {
        excluded.multipleOutputs++;
        delete consumesObj[name];
      }
    }

    return (
      <>
        <div className={'row'}>
          <div class={'col'}>
            <h2>
              Consuming <ColonJoined colon={props.colon} />:
            </h2>
          </div>
        </div>
        <div className={'row'}>
          <div class={'col'}>
            <div class={'alert alert-warning'}>
              These filters seem to be a bit janky, don't click too fast? This
              really shouldn't be possible. JS not even once.
            </div>
            <div class={'form-check'}>
              <input
                class={'form-check-input'}
                type={'checkbox'}
                id={'buildings'}
                checked={state.buildings}
                onChange={(e) =>
                  this.setState({ buildings: e.currentTarget.checked })
                }
              />
              <label class={'form-check-label'} for={'buildings'}>
                Buildings ({excluded.buildings} excluded)
              </label>
            </div>
            <div class={'form-check'}>
              <input
                class={'form-check-input'}
                type={'checkbox'}
                id={'otherInputs'}
                checked={state.multipleInputs ?? false}
                onInput={(e) =>
                  this.setState({ multipleInputs: e.currentTarget.checked })
                }
              />
              <label class={'form-check-label'} for={'otherInputs'}>
                Multiple inputs ({excluded.multipleInputs} excluded)
              </label>
            </div>
            <div class={'form-check'}>
              <input
                class={'form-check-input'}
                type={'checkbox'}
                id={'otherOutputs'}
                checked={state.multipleOutputs ?? false}
                onInput={(e) =>
                  this.setState({ multipleOutputs: e.currentTarget.checked })
                }
              />
              <label class={'form-check-label'} for={'otherOutputs'}>
                Multiple outputs ({excluded.multipleOutputs} excluded)
              </label>
            </div>
          </div>
        </div>
        <div class={'row'}>
          <div class={'col'}>
            <RecipeTable
              recipes={Object.entries(consumesObj)}
              colon={props.colon}
            />
          </div>
        </div>
      </>
    );
  }
}

const sortRecipes = ([a]: [string, unknown], [b]: [string, unknown]) => {
  const use = inUse(b) ? 1 : 0 - (inUse(a) ? 1 : 0);
  if (use !== 0) return use;
  const tech = stepsToUnlockRecipe(a) - stepsToUnlockRecipe(b);
  if (tech !== 0) return tech;
  return a.localeCompare(b);
};

export class Produces extends Component<{ colon: Colon }> {
  render(props: { colon: Colon }) {
    const makesThis = Object.entries(data.recipes.regular).filter(
      ([, { products }]) => !!products.find((p) => p.colon === props.colon),
    );
    return (
      <div class={'col'}>
        <h2>
          Making <ColonJoined colon={props.colon} />:
        </h2>
        <RecipeTable recipes={makesThis} colon={props.colon} />
      </div>
    );
  }
}

const RecipeTable = (props: { recipes: [string, JRecipe][]; colon: Colon }) => (
  <table className={'table'}>
    <thead>
      <tr>
        <th>Recipe</th>
        <th>
          <abbr title={'techs to unlock'}>T</abbr>
        </th>
        <th>
          <abbr title={'usage in factory'}>U</abbr>
        </th>
        <th>
          <abbr title={'duration (at 1x)'}>D</abbr>
        </th>
        <th>Ingredients</th>
        <th>Products</th>
      </tr>
    </thead>
    <tbody>
      {props.recipes.sort(sortRecipes).map(([name, recipe]) => (
        <tr>
          <LongName name={name} recipe={recipe} />
          <td>{stepsToUnlockRecipe(name)}</td>
          <td>{inUse(name) ? '\u2705' : '\u292B'}</td>
          <td style={'text-align: right'}>{recipe.time}</td>
          <IngProd recipe={recipe} colon={props.colon} />
        </tr>
      ))}
    </tbody>
  </table>
);

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

export const LongName = ({
  name,
  recipe,
}: {
  name: string;
  recipe: JRecipe;
}) => {
  const madeIn = recipe.producerClass;
  let copyPrint = null;
  if (
    madeIn === 'automated-factory' &&
    recipe.products.length === 1 &&
    recipe.products[0].colon.startsWith('item:') &&
    recipe.ingredients.every((ing) => ing.colon.startsWith('item:'))
  ) {
    const template = cloneDeep(BP_TEMPLATE) as DeepWriteable<
      typeof BP_TEMPLATE
    >;
    const product = recipe.products[0];
    const productName = splitColon(product.colon)[1];
    (template.entities[0].recipe as string) = name;
    (template.entities[3].control_behavior.logistic_condition.first_signal
      .name as string) = productName;
    (template.entities[5].request_filters as unknown[]) = buildRequestFilters(
      Object.fromEntries(
        recipe.ingredients.map((ing) => [ing.colon, ing.amount]),
      ),
    );

    const productItem = fromColon(product.colon)[1];
    const loc = productItem.group.name;
    copyPrint = [bp.encode(template), loc];
  }
  return (
    <td>
      <p>{recipe.localised_name}</p>
      <p>
        <span className={'font-monospace'}>{name}</span>
      </p>
      <p>
        Made in: <span className={'font-monospace'}>{madeIn}</span>
      </p>
      {copyPrint && (
        <p>
          "1x" shopping-centre assembler for section{' '}
          <span class={'font-monospace'}>{copyPrint[1]}</span>:
          <textarea
            class={'form-control big-boy'}
            readonly={true}
            style={{ width: '100%' }}
            value={copyPrint[0] ?? ''}
          />
        </p>
      )}
    </td>
  );
};

function inUse(name: string): boolean {
  for (const brick of Object.values(data.doc)) {
    for (const label of Object.keys(brick.asm)) {
      const [, recipe] = label.split('\0');
      if (recipe === name) return true;
    }
  }
  return false;
}

const BP_TEMPLATE = {
  icons: [
    {
      signal: {
        type: 'item',
        name: 'automated-factory-mk01',
      },
      index: 1,
    },
  ],
  entities: [
    {
      entity_number: 1,
      name: 'automated-factory-mk01',
      position: {
        x: -88.5,
        y: -577.5,
      },
      recipe: 'TEMPLATE',
    },
    {
      entity_number: 2,
      name: 'medium-electric-pole',
      position: {
        x: -93.5,
        y: -577.5,
      },
    },
    {
      entity_number: 3,
      name: 'stack-inserter',
      position: {
        x: -92.5,
        y: -574.5,
      },
      direction: 6,
    },
    {
      entity_number: 4,
      name: 'fast-inserter',
      position: {
        x: -92.5,
        y: -575.5,
      },
      direction: 2,
      control_behavior: {
        logistic_condition: {
          first_signal: {
            type: 'item',
            name: 'TEMPLATE',
          },
          constant: 5,
          comparator: '<',
        },
        connect_to_logistic_network: true,
      },
    },
    {
      entity_number: 5,
      name: 'logistic-chest-passive-provider',
      position: {
        x: -93.5,
        y: -575.5,
      },
    },
    {
      entity_number: 6,
      name: 'logistic-chest-requester',
      position: {
        x: -93.5,
        y: -574.5,
      },
      request_filters: [
        {
          index: 1,
          name: 'TEMPLATE',
          count: 180,
        },
      ],
    },
  ],
  item: 'blueprint',
  version: 281479275151360,
} as const;
