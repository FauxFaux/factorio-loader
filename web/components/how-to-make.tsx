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
  limitations,
  productAsFloat,
} from '../muffler/walk-recipes';
import { ItemIcon } from '../lists';
import { humanise } from '../muffler/human';

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
              const factoryName = factoryFriendlyName(recipe.producerClass);
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
                    <p>Made in: {factoryName}</p>
                    <BuildSpeed recipe={recipe} />
                    <p></p>
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
              {p.temperature ? ` @ ${p.temperature}°C` : ''}
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
    <TempRange ing={ing} />
  </>
);

export const TempRange = ({ ing }: { ing: JIngredient }) => {
  const min =
    (ing.minimum_temperature ?? Number.NEGATIVE_INFINITY) > -1e6
      ? ing.minimum_temperature
      : null;
  const max =
    (ing.maximum_temperature ?? Number.POSITIVE_INFINITY) < 1e6
      ? ing.maximum_temperature
      : null;
  if (min === null && max === null) return null;
  if (min === max) {
    return <span> @ {min}°C</span>;
  }

  if (null === min) {
    return <span> &le; {max}°C</span>;
  }

  if (null === max) {
    return <span> &ge; {min}°C</span>;
  }

  return (
    <span>
      {' '}
      @ {min}°C - {max}°C
    </span>
  );
};

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

export function factoryFriendlyName(producerClass: string) {
  const availableFactories = data.meta.factories[producerClass];
  if (!availableFactories) {
    throw new Error(`no factories for ${producerClass}`);
  }

  return data.items[Object.keys(availableFactories)[0]].localised_name.replace(
    /( MK\s*\d+)$| 1$/,
    '',
  );
}

interface BuildSpeedProps {
  recipe: JRecipe;
}

export class BuildSpeed extends Component<BuildSpeedProps> {
  render(props: BuildSpeedProps) {
    const recipe = props.recipe;
    const availableFactories = data.meta.factories[recipe.producerClass];
    if (!availableFactories) {
      return (
        <p class={'error'}>
          Invalid class: {recipe.producerClass} for {recipe.localised_name}
        </p>
      );
    }
    const limitation = limitations[recipe.producerClass];
    const modules = limitation ? data.meta.modules[limitation] : {};

    return (
      <table class={'build-speed'}>
        <thead>
          <tr>
            <th />
            {Object.entries(availableFactories).map(
              ([fac, { speed, modules }]) => (
                <th>
                  <ItemIcon
                    name={fac}
                    alt={`${fac} (crafting speed: ${speed}, modules: ${modules})`}
                  />
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              title={'with the minimal set of modules to function'}
              style={'text-align: center'}
            >
              ⊥
            </td>
            {Object.values(availableFactories).some(
              ({ speed }) =>
                speed !== Object.values(availableFactories)[0].speed,
            ) ? (
              Object.values(availableFactories).map(({ speed: baseSpeed }) => (
                <td>
                  {humanise(
                    recipe.time /
                      (baseSpeed * (1 + (Object.values(modules)?.[0] ?? 0))),
                    { altSuffix: 's/exec' },
                  )}
                </td>
              ))
            ) : (
              <td
                style={'text-align: center'}
                colSpan={Object.values(availableFactories).length}
              >
                {humanise(
                  recipe.time /
                    (Object.values(availableFactories)[0].speed *
                      (1 + (Object.values(modules)?.[0] ?? 0))),
                  { altSuffix: 's/exec' },
                )}
              </td>
            )}
          </tr>
          {Object.entries(modules ?? {}).map(([mod, speed]) => (
            <tr>
              <td>
                <ItemIcon
                  name={mod}
                  alt={`rammed full of '${mod}' (speed bonus: +${(
                    speed * 100
                  ).toFixed()}%)`}
                />
              </td>
              {Object.values(availableFactories).map(
                ({ speed: baseSpeed, modules }) => (
                  <td>
                    {humanise(
                      recipe.time / (baseSpeed * (1 + speed * modules)),
                      { altSuffix: 's/exec' },
                    )}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}
