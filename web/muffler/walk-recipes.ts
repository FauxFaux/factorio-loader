import { data } from '../datae.js';
import { splitColon } from './colon.js';
import { JIngredient } from '../objects.js';

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
  'dingrits-mk02': { colon: 'item:dingrits', amount: 0 },
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
  canMake = new Set(
    [...canMake].concat(
      [...canMake].flatMap((name) => {
        const [type, id] = splitColon(name);
        if (type !== 'fluid') return [];
        return `item:${data.recipes.barrelFormOf[id]}`;
      }),
    ),
  );
  const missingIngredients: Record<string, number> = {};

  for (let i = 0; i < 50; i++) {
    let updated = 0;
    for (const [name, rec] of Object.entries(data.recipes.regular)) {
      if (recipeBan(name)) continue;
      if (name in missingIngredients) continue;
      // const products = new Set(rec.products.map((p) => p.colon));
      const ings = (rec.ingredients ?? [])
        .concat(hiddenRequirements[name] ?? [])
        .filter((ing) => !canMake.has(ing.colon));

      if (ings.length === 0) {
        missingIngredients[name] = 0;
        continue;
      }

      const missing = ings
        .map((ing) =>
          Math.min(
            ...(recipesMaking[ing.colon]?.map(
              (name) => missingIngredients[name] ?? Infinity,
            ) ?? [Infinity]),
          ),
        )
        .reduce((sum, ing) => sum + ing, 1);

      if (!Number.isFinite(missing)) {
        continue;
      }
      missingIngredients[name] = missing;
      updated += 1;
    }
    if (updated === 0) break;
    // console.log(i, updated);
  }

  // for (const [name, rec] of Object.entries(data.recipes.regular)) {
  //   if (recipeBan(name)) continue;
  //   if (missingIngredients[name] !== undefined) continue;
  //   let s = `missing ${name}: `;
  //   for (const ing of rec.ingredients ?? []) {
  //     if (canMake.has(ing.colon)) continue;
  //     s += ing.colon + ' via. ';
  //     for (const rec of recipesMaking[ing.colon] ?? []) {
  //       if (rec in missingIngredients) continue;
  //       s += rec + ', ';
  //     }
  //   }
  //   console.log(s);
  // }

  return missingIngredients;
}
