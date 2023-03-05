import { Component } from 'preact';
import { computed, data } from '../datae';
import { objToColon } from '../muffler/colon';
import { ColonJoined, JRecipe, Recipe } from '../objects';
import { haveMade, unlockedRecipes } from '../muffler/walk-techs';

export class HowToMake extends Component<{ colon: string }> {
  render(props: { colon: string }) {
    const recipes = Object.entries(data.recipes).filter(
      ([, recipe]) =>
        undefined !==
        recipe.products.find((prod) => objToColon(prod) === props.colon),
    );

    const unlocked = unlockedRecipes();
    const canMake = haveMade();

    // const needInfoOn = new Set(
    //   ...recipes.flatMap(([, recipe]) => recipe.ingredients.map(objToColon))
    //     .filter((colon) => !canMake.has(colon)),
    // );

    let scanning = recipes.map(([name]) => name);
    for (let i = 0; i < 4; ++i) {
      let newRecipes: string[] = [];
      for (const name of scanning) {
        if (name.endsWith('-barrel')) continue;
        const recipe = data.recipes[name];
        for (const ing of recipe.ingredients) {
          const colon = objToColon(ing);
          if (canMake.has(colon)) continue;
          for (const [name] of Object.entries(data.recipes)
            .filter(([name]) => !name.endsWith('-barrel'))
            .filter(([, recipe]) =>
              recipe.products.some((p) => objToColon(p) === colon),
            )) {
            newRecipes.push(name);
          }
        }
      }
      for (const recipe of newRecipes) {
        if (!recipes.some(([name]) => name === recipe)) recipes.push([recipe, data.recipes[recipe]]);
      }
      scanning = newRecipes;
    }

    console.log(recipes);

    return (
      <table class={'table'}>
        <tbody>
          {recipes
            // .sort(([an, ao], [bn, bo]) => usefulness(bn, bo) - usefulness(an, ao))
            .map(([name, recipe]) => (
              <tr>
                <td>
                  {usefulness(name, recipe)}{' '}
                  {unlocked.has(name) ? 'true' : 'false'}
                </td>
                <td><abbr title={name}>{recipe.localised_name}</abbr></td>
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
                    {recipe.ingredients.map((ing) => (
                      <li>
                        <span class={'amount'}>{ing.amount}</span> &times;{' '}
                        <ColonJoined label={objToColon(ing)} />
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    );
  }
}

function usefulness(name: string, recipe: JRecipe): number {
  let score = 0;

  if (!unlockedRecipes().has(name)) {
    score -= 10;
  }

  score -= recipe.ingredients.length;
  score -= recipe.products.length;

  for (const ing of recipe.ingredients) {
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

  for (const prod of recipe.products) {
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
