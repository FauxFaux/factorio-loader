import { Component } from 'preact';
import { computed, data } from '../datae';
import { Colon, splitColon } from '../muffler/colon';
import { ColonJoined, JIngredient, JProduct, JRecipe } from '../objects';
import { haveMade } from '../muffler/walk-techs';
import { stepsToUnlockRecipe, techToUnlock } from '../pages/next';
import {
  buildMaking,
  buildMissingIngredients,
  ingredients,
  productAsFloat,
} from '../muffler/walk-recipes';

export class HowToMake extends Component<{ colon: Colon }> {
  render(props: { colon: Colon }) {
    const recipesMaking = buildMaking();

    if (!recipesMaking[props.colon]) {
      return <div>Production is believed to be impossible</div>;
    }

    const canMake = haveMade();
    const missingIngredients = buildMissingIngredients(canMake, recipesMaking);

    const recipes = [...recipesMaking[props.colon]];

    const bad = (name: string) =>
      (missingIngredients[name] ?? Infinity) + stepsToUnlockRecipe(name);
    recipes.sort((a, b) => bad(a) - bad(b));

    // const needInfoOn = new Set(
    //   ...recipes.flatMap(([, recipe]) => recipe.ingredients.map(objToColon))
    //     .filter((colon) => !canMake.has(colon)),
    // );

    let scanning = recipes;
    for (let i = 0; i < 10; ++i) {
      const newIngredients = new Set<string>();
      for (const name of scanning) {
        if (!name) continue;
        const recipe = data.recipes.regular[name];
        if (!recipe.producers) continue;
        for (const ing of ingredients(name)) {
          const colon = ing.colon;
          if (canMake.has(colon)) continue;
          newIngredients.add(colon);
        }
      }

      const newRecipes = new Set<string>();

      for (const ing of newIngredients) {
        const candidates = [...(recipesMaking[ing] ?? [])];
        const best = candidates.sort((a, b) => bad(a) - bad(b))?.[0];
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
            <th>Ingredients</th>
            <th>Products</th>
          </tr>
        </thead>
        <tbody>
          {recipes
            .slice(0, 100)
            .filter((name) => !!data.recipes.regular[name])
            // .sort(([an, ao], [bn, bo]) => usefulness(bn, bo) - usefulness(an, ao))
            .map((name) => {
              const recipe = data.recipes.regular[name];
              const lockedTechs = stepsToUnlockRecipe(name);
              const toUnlock = techToUnlock(name) ?? '??';
              const missing = missingIngredients[name];
              return (
                <tr>
                  <td>
                    <ul class={'ul-none'}>
                      <li>
                        {missing < 500 ? (
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
                    <p>
                      <abbr title={name}>{recipe.localised_name}</abbr>
                    </p>
                    <p>Made in: {recipe.producers?.join(', ') ?? '??'}</p>
                  </td>
                  <IngProd recipe={recipe} colon={props.colon} />
                </tr>
              );
            })}
        </tbody>
      </table>
    );
  }
}

export const IngProd = (props: { recipe: JRecipe; colon: Colon }) => (
  <>
    <td>
      <ul className={'ul-none'}>
        {props.recipe.ingredients
          ?.sort((a, b) => {
            if (a.colon === props.colon) return -1;
            if (b.colon === props.colon) return 1;
            return b.amount - a.amount;
          })
          .map((ing) => (
            <li>
              <IngredientLine ing={ing} />
            </li>
          ))}
      </ul>
    </td>
    <td>
      <ul class={'ul-none'}>
        {props.recipe.products
          .sort((a, b) => {
            if (a.colon === props.colon) return -1;
            if (b.colon === props.colon) return 1;
            return productAsFloat(b) - productAsFloat(a);
          })
          .map((p) => (
            <li>
              <ProductAmount product={p} /> &times;{' '}
              <ColonJoined colon={p.colon} />
            </li>
          ))}
      </ul>
    </td>
  </>
);

export const IngredientLine = ({ ing }: { ing: JIngredient }) => (
  <>
    <Availability colon={ing.colon} />{' '}
    <span class={'amount'}>{ing.amount}</span> &times;{' '}
    <ColonJoined colon={ing.colon} />
  </>
);

export const ProductAmount = ({ product }: { product: JProduct }) => {
  if (
    product.probability &&
    product.probability !== 1 &&
    'amount' in product &&
    product.amount === 1
  ) {
    return (
      <span className={'amount'}>
        <abbr title={`${100 * product.probability}% chance of one item`}>
          {product.probability}
        </abbr>
      </span>
    );
  }
  const perc =
    product.probability !== undefined && product.probability !== 1
      ? `${100 * product.probability}%`
      : undefined;
  if ('amount' in product) {
    return (
      <span className={'amount'}>
        {perc} {product.amount}
      </span>
    );
  }

  return (
    <span className={'amount'}>
      {perc} {product.amount_min} - {product.amount_max}
    </span>
  );
};

const Availability = ({ colon }: { colon: string }) => {
  const [, name] = splitColon(colon);
  const ps =
    data.prodStats[colon] ??
    data.prodStats['fluid:' + computed.barrelFluid[name]];
  let icon;
  let alt;
  if (ps?.ltn ?? 0 > 1) {
    icon = require('svg-url-loader!flat-color-icons/svg/low_priority.svg');
    alt = 'all good; shipped on ltn';
    // 'input' for items being produced, 'output' for fluids being produced; screw it
  } else if ((ps?.input?.total ?? 0) >= 1 || (ps?.output?.total ?? 0) >= 1) {
    icon = require('svg-url-loader!flat-color-icons/svg/medium_priority.svg');
    alt = 'produced somewhere, but not shipped';
  } else {
    icon = require('svg-url-loader!flat-color-icons/svg/high_priority.svg');
    alt = 'not produced anywhere';
  }
  return <img class={'avail-icon'} src={icon} alt={alt} />;
};
