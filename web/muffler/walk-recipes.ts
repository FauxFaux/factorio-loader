import { data } from '../datae';
import { splitColon } from './colon';
import { JIngredient } from '../objects';

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

      // this appears to mean that the recipe is invalid?
      if (!rec.producers) continue;

      const ings = ingredients(name).filter((ing) => !canMake.has(ing.colon));

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

const hiddenByProducer: Record<string, string> = {
  'kmauts-enclosure': 'item:kmauts',
  'dingrits-pack': 'item:dingrits',
  'scrondrix-pen': 'item:scrondrix',
};

export function ingredients(name: string): JIngredient[] {
  const rec = data.recipes.regular[name];
  if (!rec) return [];
  const producers = (rec.producers ?? []).sort().join(',');

  const base = rec.ingredients ?? [];

  if (producers in hiddenByProducer) {
    return base.concat([{ colon: hiddenByProducer[producers], amount: 0 }]);
  }

  return base;
}
