import { computed, data } from '../datae';
import { splitColon, tupleToColon } from './colon';
import { JIngredient } from '../objects';

export const hiddenRequirements: Record<string, JIngredient> = {
  'caged-scrondrix-1': { colon: 'item:scrondrix', amount: 0 },
  'caged-scrondrix-1a': { colon: 'item:scrondrix', amount: 0 },
  'caged-scrondrix-2': { colon: 'item:scrondrix', amount: 0 },
  'caged-scrondrix-2a': { colon: 'item:scrondrix', amount: 0 },
  'caged-scrondrix-3': { colon: 'item:scrondrix', amount: 0 },
  'caged-scrondrix-3a': { colon: 'item:scrondrix', amount: 0 },
  'caged-scrondrix-4': { colon: 'item:scrondrix', amount: 0 },
  'caged-scrondrix-4a': { colon: 'item:scrondrix', amount: 0 },
  'caged-scrondrix-5': { colon: 'item:scrondrix', amount: 0 },
  'scrondrix-cub-1': { colon: 'item:scrondrix', amount: 0 },
  'scrondrix-cub-2': { colon: 'item:scrondrix', amount: 0 },
  'scrondrix-cub-3': { colon: 'item:scrondrix', amount: 0 },
  'scrondrix-cub-4': { colon: 'item:scrondrix', amount: 0 },
  'scrondrix-mature-01': { colon: 'item:scrondrix', amount: 0 },
  'caged-dingrits1': { colon: 'item:dingrits', amount: 0 },
  'caged-dingrits2': { colon: 'item:dingrits', amount: 0 },
  'caged-dingrits3': { colon: 'item:dingrits', amount: 0 },
  'caged-dingrits4': { colon: 'item:dingrits', amount: 0 },
  'caged-dingrits5': { colon: 'item:dingrits', amount: 0 },
  'caged-dingrits6': { colon: 'item:dingrits', amount: 0 },
  'caged-dingrits7': { colon: 'item:dingrits', amount: 0 },
  'dingrits-mature-01': { colon: 'item:dingrits', amount: 0 },
};

export function recipeBan(name: string): boolean {
  return (
    name.endsWith('-barrel') ||
    name.endsWith('-pyvoid') ||
    name.endsWith('-pyvoid-fluid') ||
    name.endsWith('-pyvoid-gas')
  );
}

export function buildMaking() {
  const recipesMaking: Record<string, string[]> = {};
  for (const [name, recipe] of Object.entries(data.recipes.regular)) {
    if (recipeBan(name)) continue;
    for (const prod of recipe.products) {
      const colon = prod.colon;
      if (!recipesMaking[colon]) recipesMaking[colon] = [];
      recipesMaking[colon].push(name);
    }
  }
  return recipesMaking;
}

export function buildMissingIngredients(
  canMake: Set<string>,
  recipesMaking: Record<string, string[]>,
) {
  const missingIngredients: Record<string, number> = {};
  const countMissing = (name: string, context: string[] = []): number => {
    if (missingIngredients[name] === null) {
      // console.log('circular dependency', name, context);
      return 100;
    }
    if (missingIngredients[name] !== undefined) {
      return missingIngredients[name];
    }
    missingIngredients[name] = null as any;
    const recipe = data.recipes.regular[name];
    if (!recipe) {
      return 10;
    }
    let missing = 0;
    const products = new Set(...recipe.products.map((p) => p.colon));
    for (const ing of (recipe.ingredients ?? []).concat(
      hiddenRequirements[name] ?? [],
    )) {
      const colon = ing.colon;
      if (products.has(colon)) continue;
      if (canMake.has(colon)) continue;
      if (!recipesMaking[colon]) {
        const [type, sub] = splitColon(colon);
        if (type === 'item') {
          const fluid = computed.barrelFluid[sub];
          if (fluid) {
            missing += Math.min(
              ...recipesMaking[tupleToColon(['fluid', fluid])].map((name) =>
                countMissing(name, context.concat(colon + ' (fluid)')),
              ),
            );
          } else {
            missing += 20;
          }
        } else {
          missing += 20;
        }
        continue;
      }
      missing +=
        Math.min(
          ...recipesMaking[colon].map((name) =>
            countMissing(name, context.concat(colon)),
          ),
        ) + 1;
    }
    missingIngredients[name] = missing;
    return missing;
  };

  // for (const name of Object.keys(data.recipes.regular)) {
  //   if (recipeBan(name)) continue;
  //   countMissing(name);
  countMissing('arthurian-egg-01');
  // }
  return missingIngredients;
}
