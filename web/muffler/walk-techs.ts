import { data } from '../datae';

export function unlockedRecipes(): Set<string> {
  return new Set(
    Object.values(data.technologies)
      .filter((t) => t.researched)
      .flatMap((t) => t.unlocks),
  );
}

export function haveMade(): Set<string> {
  return new Set(
    Object.entries(data.prodStats)
      // either stat is fine
      .filter(
        ([, stats]) =>
          (stats.input?.total ?? 0) >= 0 || (stats.output?.total ?? 0) >= 0,
      )
      .map(([name]) => name),
  );
}
