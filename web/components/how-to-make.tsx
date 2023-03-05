import { Component } from 'preact';
import { data } from '../datae';
import { Colon, objToColon } from '../muffler/colon';
import { ColonJoined, JIngredient, JRecipe } from '../objects';
import { haveMade, unlockedRecipes } from '../muffler/walk-techs';
import { stepsToUnlock, stepsToUnlockRecipe } from '../pages/next';

function recipeBan(name: string): boolean {
  return (
    name.endsWith('-barrel') ||
    name.endsWith('-pyvoid') ||
    name.endsWith('-pyvoid-fluid') ||
    name.endsWith('-pyvoid-gas')
  );
}

export class HowToMake extends Component<{ colon: Colon }> {
  render(props: { colon: Colon }) {
    const recipesMaking: Record<string, string[]> = {};
    for (const [name, recipe] of Object.entries(data.recipes)) {
      if (recipeBan(name)) continue;
      for (const prod of recipe.products) {
        const colon = objToColon(prod);
        if (!recipesMaking[colon]) recipesMaking[colon] = [];
        recipesMaking[colon].push(name);
      }
    }

    const canMake = haveMade();

    const missingIngredients: Record<string, number> = {};
    const countMissing = (name: string) => {
      if (missingIngredients[name] === null) {
        return 100;
      }
      if (missingIngredients[name] !== undefined)
        return missingIngredients[name];
      missingIngredients[name] = null as any;
      const recipe = data.recipes[name];
      if (!recipe) return 10;
      let missing = 0;
      const products = new Set(...recipe.products.map(objToColon));
      for (const ing of recipe.ingredients ?? []) {
        const colon = objToColon(ing);
        if (products.has(colon)) continue;
        if (canMake.has(colon)) continue;
        if (!recipesMaking[colon]) continue;
        missing +=
          Math.min(...recipesMaking[colon].map((name) => countMissing(name))) +
          1;
      }
      missingIngredients[name] = missing;
      return missing;
    };

    for (const name of Object.keys(data.recipes)) {
      if (recipeBan(name)) continue;
      countMissing(name);
    }

    console.log(missingIngredients);

    // const recipes = recipesMaking[props.colon];
    const recipes = Object.entries(data.recipes)
      .filter(([name]) => !recipeBan(name))
      .filter(
        ([, recipe]) =>
          undefined !==
          recipe.products.find((prod) => objToColon(prod) === props.colon),
      );

    // const needInfoOn = new Set(
    //   ...recipes.flatMap(([, recipe]) => recipe.ingredients.map(objToColon))
    //     .filter((colon) => !canMake.has(colon)),
    // );

    let scanning = recipes.map(([name]) => name);
    for (let i = 0; i < 4; ++i) {
      let newRecipes: string[] = [];
      for (const name of scanning) {
        const recipe = data.recipes[name];
        for (const ing of recipe?.ingredients ?? []) {
          const colon = objToColon(ing);
          if (canMake.has(colon)) continue;
          for (const [name] of Object.entries(data.recipes)
            .filter(([name]) => !recipeBan(name))
            .filter(([, recipe]) =>
              recipe.products.some((p) => objToColon(p) === colon),
            )) {
            newRecipes.push(name);
          }
        }
      }
      for (const recipe of newRecipes) {
        if (!recipes.some(([name]) => name === recipe))
          recipes.push([recipe, data.recipes[recipe]]);
      }
      // TODO: cull earlier
      if (recipes.length > 100) break;
      scanning = newRecipes;
    }

    console.log(recipes);

    return (
      <table class={'table'}>
        <tbody>
          {recipes
            .slice(0, 100)
            // .sort(([an, ao], [bn, bo]) => usefulness(bn, bo) - usefulness(an, ao))
            .map(([name]) => {
              const recipe = data.recipes[name];
              return (
                <tr>
                  <td>
                    {missingIngredients[name]} {usefulness(name, recipe)}{' '}
                    {stepsToUnlockRecipe(name)}
                  </td>
                  <td>
                    <abbr title={name}>{recipe.localised_name}</abbr>
                  </td>
                  <td>
                    <ul class={'ul-none'}>
                      {recipe.products
                        .sort((a, b) => {
                          if (objToColon(a) === props.colon) return -1;
                          if (objToColon(b) === props.colon) return 1;
                          return (b.amount ?? 1) - (a.amount ?? 1);
                        })
                        .map((p) => (
                          <li>
                            <span class={'amount'}>{p.amount}</span> &times;{' '}
                            <ColonJoined label={objToColon(p)} />
                          </li>
                        ))}
                    </ul>
                  </td>
                  <td>
                    <ul class={'ul-none'}>
                      {recipe.ingredients?.map((ing) => (
                        <li>
                          <IngredientLine ing={ing} />
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
  }
}

export const IngredientLine = ({ ing }: { ing: JIngredient }) => (
  <>
    <Availability colon={objToColon(ing)} />{' '}
    <span class={'amount'}>{ing.amount}</span> &times;{' '}
    <ColonJoined label={objToColon(ing)} />
  </>
);

const Availability = ({ colon }: { colon: string }) => {
  const ps = data.prodStats[colon];
  let icon;
  let alt;
  if (ps?.ltn ?? 0 > 1) {
    icon = require('svg-url-loader!flat-color-icons/svg/low_priority.svg');
    alt = 'all good; shipped on ltn';
  } else if (ps?.output?.total ?? 0 > 1) {
    icon = require('svg-url-loader!flat-color-icons/svg/medium_priority.svg');
    alt = 'produced somewhere, but not shipped';
  } else {
    icon = require('svg-url-loader!flat-color-icons/svg/high_priority.svg');
    alt = 'not produced anywhere';
  }
  return <img class={'avail-icon'} src={icon} alt={alt} />;
};

function usefulness(name: string, recipe: JRecipe): number {
  let score = 0;

  if (!unlockedRecipes().has(name)) {
    score -= 10;
  }

  score -= recipe.ingredients?.length ?? 10;
  score -= recipe.products?.length ?? 10;

  for (const ing of recipe.ingredients ?? []) {
    const scale = ing.amount ?? 1;
    const colon = objToColon(ing);

    if (ing.type === 'fluid') {
      score -= 1;
    }

    // it was shipped by ltn last simulation
    const ps = data.prodStats[colon];
    if ((ps?.ltn ?? 0) > 1e3 * scale) {
      score += 2;
    }

    // we've made a load of them
    if (ps?.output?.total ?? 0 > 1e4 * scale) {
      score += 1;
    }

    // we're making a load of them
    if (ps?.output?.perTime[3] ?? 0 > 1e2 * scale) {
      score += 1;
    }
  }

  for (const prod of recipe.products ?? []) {
    const colon = objToColon(prod);
    const scale = (prod.probability ?? 1) * (prod.amount ?? 1);

    if (prod.type === 'fluid') {
      score -= 1;
    }

    // it was shipped by ltn last simulation
    const ps = data.prodStats[colon];
    if ((ps?.ltn ?? 0) > 1e3 * scale) {
      score += 2;
    }

    // we've made a load of them
    if (ps?.input?.total ?? 0 > 1e4 * scale) {
      score += 1;
    }

    // we're making a load of them
    if (ps?.input?.perTime[3] ?? 0 > 1e2 * scale) {
      score += 1;
    }
  }

  return score;
}
