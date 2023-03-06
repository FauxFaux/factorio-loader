import { Component } from 'preact';
import { data } from '../datae';
import { Colon, objToColon } from '../muffler/colon';
import { ColonJoined, JIngredient } from '../objects';
import { haveMade } from '../muffler/walk-techs';
import { stepsToUnlockRecipe, techToUnlock } from '../pages/next';

function recipeBan(name: string): boolean {
  return (
    name.endsWith('-barrel') ||
    name.endsWith('-pyvoid') ||
    name.endsWith('-pyvoid-fluid') ||
    name.endsWith('-pyvoid-gas')
  );
}

const hiddenRequirements: Record<string, JIngredient> = {
  'caged-scrondrix-1': { type: 'item', name: 'scrondrix', amount: 0 },
  'caged-scrondrix-1a': { type: 'item', name: 'scrondrix', amount: 0 },
  'caged-scrondrix-2': { type: 'item', name: 'scrondrix', amount: 0 },
  'caged-scrondrix-2a': { type: 'item', name: 'scrondrix', amount: 0 },
  'caged-scrondrix-3': { type: 'item', name: 'scrondrix', amount: 0 },
  'caged-scrondrix-3a': { type: 'item', name: 'scrondrix', amount: 0 },
  'caged-scrondrix-4': { type: 'item', name: 'scrondrix', amount: 0 },
  'caged-scrondrix-4a': { type: 'item', name: 'scrondrix', amount: 0 },
  'caged-scrondrix-5': { type: 'item', name: 'scrondrix', amount: 0 },
  'scrondrix-cub-1': { type: 'item', name: 'scrondrix', amount: 0 },
  'scrondrix-cub-2': { type: 'item', name: 'scrondrix', amount: 0 },
  'scrondrix-cub-3': { type: 'item', name: 'scrondrix', amount: 0 },
  'scrondrix-cub-4': { type: 'item', name: 'scrondrix', amount: 0 },
  'scrondrix-mature-01': { type: 'item', name: 'scrondrix', amount: 0 },
  'caged-dingrits1': { type: 'item', name: 'dingrits', amount: 0 },
  'caged-dingrits2': { type: 'item', name: 'dingrits', amount: 0 },
  'caged-dingrits3': { type: 'item', name: 'dingrits', amount: 0 },
  'caged-dingrits4': { type: 'item', name: 'dingrits', amount: 0 },
  'caged-dingrits5': { type: 'item', name: 'dingrits', amount: 0 },
  'caged-dingrits6': { type: 'item', name: 'dingrits', amount: 0 },
  'caged-dingrits7': { type: 'item', name: 'dingrits', amount: 0 },
  'dingrits-mature-01': { type: 'item', name: 'dingrits', amount: 0 },
};

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

    if (!recipesMaking[props.colon]) {
      return <div>Production is believed to be impossible</div>;
    }

    const canMake = haveMade();

    const missingIngredients: Record<string, number> = {};
    const countMissing = (name: string) => {
      if (missingIngredients[name] === null) {
        return 100;
      }
      if (missingIngredients[name] !== undefined) {
        return missingIngredients[name];
      }
      missingIngredients[name] = null as any;
      const recipe = data.recipes[name];
      if (!recipe) return 10;
      let missing = 0;
      const products = new Set(...recipe.products.map(objToColon));
      for (const ing of (recipe.ingredients ?? []).concat(
        hiddenRequirements[name] ?? [],
      )) {
        const colon = objToColon(ing);
        if (products.has(colon)) continue;
        if (canMake.has(colon)) continue;
        if (!recipesMaking[colon]) {
          missing += 20;
          continue;
        }
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

    const recipes = [...recipesMaking[props.colon]];

    const bad = (name: string) =>
      missingIngredients[name] + stepsToUnlockRecipe(name);
    recipes.sort((a, b) => bad(a) - bad(b));

    // const needInfoOn = new Set(
    //   ...recipes.flatMap(([, recipe]) => recipe.ingredients.map(objToColon))
    //     .filter((colon) => !canMake.has(colon)),
    // );

    let scanning = recipes;
    for (let i = 0; i < 10; ++i) {
      const newIngredients = new Set<string>();
      for (const name of scanning) {
        const recipe = data.recipes[name];
        for (const ing of (recipe?.ingredients ?? []).concat(
          hiddenRequirements[name] ?? [],
        )) {
          const colon = objToColon(ing);
          if (canMake.has(colon)) continue;
          newIngredients.add(colon);
        }
      }

      const newRecipes = new Set<string>();

      for (const ing of newIngredients) {
        const candidates = [...(recipesMaking[ing] ?? [])];
        const best = candidates.sort(
          (a, b) => bad(a) - bad(b),
        )?.[0];
        newRecipes.add(best);
      }

      for (const recipe of newRecipes) {
        if (!recipes.some((name) => name === recipe)) {
          recipes.push(recipe);
        }
      }
      // TODO: cull earlier
      if (recipes.length > 100) break;
      scanning = [...newRecipes];
    }

    return (
      <table class={'table'}>
        <thead>
          <tr>
            <th>Reqs</th>
            <th>Recipe name</th>
            <th>Products</th>
            <th>Ingredients</th>
          </tr>
        </thead>
        <tbody>
          {recipes
            .slice(0, 100)
            .filter((name) => !!data.recipes[name])
            // .sort(([an, ao], [bn, bo]) => usefulness(bn, bo) - usefulness(an, ao))
            .map((name) => {
              const recipe = data.recipes[name];
              const lockedTechs = stepsToUnlockRecipe(name);
              const toUnlock = techToUnlock(name) ?? '??';
              const missing = missingIngredients[name];
              return (
                <tr>
                  <td>
                    <ul class={'ul-none'}>
                      <li>
                        {missing < 100 ? (
                          <abbr
                            title={`found a production chain requiring ${missing} entirely new items`}
                          >
                            {missing} ✨
                          </abbr>
                        ) : (
                          <abbr
                            title={
                              `found only a production chain with a cycle; presumably ` +
                              `requiring bootstrapping somehow (${missing}) (or this is a massive bug)`
                            }
                          >
                            🔃
                          </abbr>
                        )}
                      </li>
                      <li>
                        {lockedTechs === 0 ? (
                          <abbr title={`available`}>✅</abbr>
                        ) : lockedTechs === 1 ? (
                          <abbr
                            title={`requires researching "${toUnlock}" (available)`}
                          >
                            🔒
                          </abbr>
                        ) : (
                          <abbr
                            title={`requires ${lockedTechs} technologies to unlock, up to "${toUnlock}"`}
                          >
                            {lockedTechs} 🔒🔒
                          </abbr>
                        )}
                      </li>
                    </ul>
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
    // yes, 'input' is the right way around
  } else if (ps?.input?.total ?? 0 > 1) {
    icon = require('svg-url-loader!flat-color-icons/svg/medium_priority.svg');
    alt = 'produced somewhere, but not shipped';
  } else {
    icon = require('svg-url-loader!flat-color-icons/svg/high_priority.svg');
    alt = 'not produced anywhere';
  }
  return <img class={'avail-icon'} src={icon} alt={alt} />;
};
