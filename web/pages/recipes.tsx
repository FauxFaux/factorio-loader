import { Colon } from '../muffler/colon';
import { Component } from 'preact';
import { data } from '../datae';
import { IngProd } from '../components/how-to-make';
import { stepsToUnlockRecipe } from './next';
import { ColonJoined, JRecipe } from '../objects';

export class Consumes extends Component<{ colon: Colon }> {
  render(props: { colon: Colon }) {
    const consumesThis = Object.entries(data.recipes.regular).filter(
      ([, { ingredients }]) =>
        !!ingredients.find((p) => p.colon === props.colon),
    );
    return (
      <div class={'col'}>
        <h2>
          Consuming <ColonJoined colon={props.colon} />:
        </h2>
        <RecipeTable recipes={consumesThis} colon={props.colon} />
      </div>
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
