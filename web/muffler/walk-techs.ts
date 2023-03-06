import { data } from '../datae';
import { objToColon } from './colon';

export function unlockedRecipes(): Set<string> {
  return new Set(
    Object.values(data.technologies)
      .filter((t) => t.researched)
      .flatMap((t) => t.unlocks),
  );
}

export function unlockedItems(): Set<string> {
  return new Set(
    [...unlockedRecipes()].flatMap((recipe) =>
      data.recipes[recipe].products.flatMap((p) => objToColon(p)),
    ),
  );
}

export function haveMade(): Set<string> {
  return new Set(
    Object.entries(data.prodStats)
      // yes, 'input' is the right way around
      .filter(([, stats]) => (stats.input?.total ?? 0) > 0)
      .map(([name]) => name),
  );
}
