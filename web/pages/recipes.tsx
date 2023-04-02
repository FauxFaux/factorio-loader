import { Colon, fromColon } from '../muffler/colon';
import { Component } from 'preact';
import { data } from '../datae';
import { IngProd } from '../components/how-to-make';
import { stepsToUnlockRecipe } from './next';
import { ColonJoined, JProduct, JRecipe } from '../objects';
import { productAsFloat } from '../muffler/walk-recipes';

interface Filters {
  buildings: boolean;
  multipleInputs: boolean;
  multipleOutputs: boolean;
}

function isBuilding(colon: Colon) {
  const [kind, obj] = fromColon(colon);
  if (kind !== 'item') return false;
  return (
    obj.subgroup.name.includes('-buildings-') || // e.g. crystal mine
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

const LongName = ({ name, recipe }: { name: string; recipe: JRecipe }) => (
  <td>
    <p>{recipe.localised_name}</p>
    <p>
      <span className={'font-monospace'}>{name}</span>
    </p>
    <p>
      Made in:{' '}
      <span className={'font-monospace'}>
        {recipe.producers?.join(', ') ?? '??'}
      </span>
    </p>
  </td>
);

function inUse(name: string): boolean {
  for (const brick of Object.values(data.doc)) {
    for (const label of Object.keys(brick.asm)) {
      const [, recipe] = label.split('\0');
      if (recipe === name) return true;
    }
  }
  return false;
}
