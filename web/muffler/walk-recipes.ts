import { data, Limitation } from '../datae';
import { Colon, splitColon } from './colon';
import { JIngredient, JProduct, JRecipe } from '../objects';

export function recipeBan(name: string): boolean {
  return (
    name.endsWith('-barrel') ||
    name.endsWith('-pyvoid') ||
    name.endsWith('-pyvoid-fluid') ||
    name.endsWith('-pyvoid-gas')
  );
}

function fillBarrel(fluidName: string): JRecipe {
  return {
    ingredients: [
      {
        colon: 'item:empty-barrel',
        amount: 1,
      },
      {
        colon: `fluid:${fluidName}`,
        amount: 50,
      },
    ],
    products: [
      {
        // TODO: gross approximation
        colon: `item:${fluidName}-barrel`,
        amount: 1,
      },
    ],
    producerClass: 'automated-factory',
    localised_name: `Fill \`${fluidName}\` Barrel`,
    time: 0.2,
    unlocked_from_start: true,
    category: 'intermediate-products',
  };
}

export function makeUpRecipe(recipeName: string): JRecipe | undefined {
  const regular = data.recipes.regular[recipeName];
  if (regular) return regular;

  let ma = recipeName.match(/^fill-(.*)-barrel$/);
  if (ma) {
    return fillBarrel(ma[1]);
  }

  ma = recipeName.match(/^(.*)-pyvoid$/);
  if (ma) {
    return {
      ingredients: [
        {
          colon: `item:${ma[1]}`,
          amount: 1,
        },
      ],
      products: [
        {
          colon: `item:ash`,
          amount: 1,
          probability: 0.2,
        },
      ],
      // as in, the building named Burner
      producerClass: 'burner',
      localised_name: `Void \`${ma[1]}\``,
      unlocked_from_start: true,
      category: 'void',
      // guess
      time: 0.2,
    };
  }

  ma = recipeName.match(/^(.*)-pyvoid(?:-fluid|-gas)?$/);
  if (ma) {
    return {
      ingredients: [
        {
          colon: `fluid:${ma[1]}`,
          amount: 20_000,
        },
      ],
      products: [],
      producerClass: 'sinkhole',
      localised_name: `Void \`${ma[1]}\``,
      unlocked_from_start: true,
      category: 'void',
      // guess
      time: 0.2,
    };
  }

  return undefined;
}

export type RecipeName = string;
export function buildMaking() {
  const recipesMaking: Record<Colon, RecipeName[]> = {};
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
    for (const name of Object.keys(data.recipes.regular)) {
      if (recipeBan(name)) continue;
      if (name in missingIngredients) continue;

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
  'bhoddos-culture': 'item:bhoddos',
  'dingrits-pack': 'item:dingrits',
  'kmauts-enclosure': 'item:kmauts',
  'scrondrix-pen': 'item:scrondrix',
  'simik-den': 'item:simik',
  'fawogae-plantation': 'item:fawogae',
  'ralesia-plantation': 'item:ralesias',
  'mega-farm': 'item:disabled-mega-farm',
  'yotoi-aloe-orchard': 'item:yotoi-aloe',
  'guar-gum-plantation': 'item:guar',
  'zipir-reef': 'item:zipir',
  // moss, fish, sap, and seaweed are excluded, as they don't have non-environmental bootstraps
};

export const limitations: Record<string, Limitation> = {
  'arqad-hive': 'arqad',
  'arthurian-pen': 'arthurian',
  'auog-paddock': 'auog',
  'bhoddos-culture': 'bhoddos',
  'cadaveric-arum': 'cadaveric-arum',
  'cridren-enclosure': 'cridren',
  'dhilmos-pool': 'dhilmos',
  'dingrits-pack': 'dingrits',
  'ez-ranch': 'korlex',
  'fawogae-plantation': 'fawogae',
  'fish-farm': 'fish',
  fwf: 'tree-mk01',
  'grods-swamp': 'grod',
  'kicalk-plantation': 'kicalk',
  'kmauts-enclosure': 'kmauts',
  'moss-farm': 'moss',
  'mukmoux-pasture': 'mukmoux',
  'navens-culture': 'navens',
  'phadai-enclosure': 'phadai',
  'phagnot-corral': 'phagnot',
  // don't ask
  'prandium-lab': 'cottongut-mk01',
  'ralesia-plantation': 'ralesias',
  'rennea-plantation': 'rennea',
  'sap-extractor': 'sap-tree',
  'scrondrix-pen': 'scrondrix',
  'seaweed-crop': 'seaweed',
  'simik-den': 'simik',
  'sponge-culture': 'sea-sponge',
  'trits-reef': 'trits',
  'tuuphra-plantation': 'tuuphra',
  'ulric-corral': 'ulric',
  'vonix-den': 'vonix',
  'vrauks-paddock': 'vrauks',
  xenopen: 'xeno',
  'xyhiphoe-pool': 'xyhiphoe',
  'yaedols-culture': 'yaedols',
  'yotoi-aloe-orchard': 'yotoi',
  'zipir-reef': 'zipir1',
};

export function ingredients(name: string): JIngredient[] {
  const rec = makeUpRecipe(name);
  if (!rec) return [];
  const producers = rec.producerClass;

  const base = rec.ingredients ?? [];

  if (producers in hiddenByProducer) {
    return base.concat([{ colon: hiddenByProducer[producers], amount: 0 }]);
  }

  return base;
}

export function productAsFloat(prod: JProduct): number {
  const prob = prod.probability ?? 1;
  let mid: number;
  if ('amount' in prod) {
    mid = prod.amount;
  } else {
    mid = (prod.amount_max + prod.amount_min) / 2;
  }
  // don't think this happens often enough that anyone cares
  if (!Number.isFinite(mid)) mid = 1;
  mid *= prob;
  return mid;
}
