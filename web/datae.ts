import { BlockContent } from '../scripts/load-recs';
import { JFluid, JItem, JRecipe } from './objects';
import { Colon } from './muffler/colon';
import { LtnSummary, precomputeLtnSummary } from './ltn-summary';

export const data = {
  doc: {} as Record<string, BlockContent>,
  items: {} as Record<string, JItem>,
  icons: {} as Record<string, string>,
  fluids: {} as Record<string, JFluid>,
  recipes: {} as Record<string, JRecipe>,
  prodStats: {} as Record<
    Colon,
    { input?: FlowStats; output?: FlowStats; ltn?: number }
  >,
  flowDiagrams: [] as string[],
  technologies: {} as Record<
    string,
    {
      researched: boolean;
      requires: string[];
      unlocks: string[];
    }
  >,
} as const;

export interface FlowStats {
  total: number;
  perTime: number[];
}

export const computed = {
  ltnSummary: {} as Record<string, LtnSummary>,
  fluidBarrel: {} as Record<string, string>,
  barrelFluid: {} as Record<string, string>,
};

export function precompute() {
  computed.ltnSummary = precomputeLtnSummary();
  computed.fluidBarrel = precomputeFluidBarrel();
  computed.barrelFluid = Object.fromEntries(
    Object.entries(computed.fluidBarrel).map(([k, v]) => [v, k] as const),
  );
}

function precomputeFluidBarrel() {
  return Object.fromEntries(
    Object.values(data.recipes)
      .filter(
        (rec) =>
          rec.ingredients?.length === 2 &&
          rec.products?.length === 1 &&
          rec.products?.[0]?.type === 'item' &&
          undefined !==
            rec.ingredients?.find((ing) => ing.name === 'empty-barrel'),
      )
      .flatMap((rec) => {
        const fluid = rec.ingredients.find(
          (ing) => ing.name !== 'empty-barrel' && ing.type === 'fluid',
        );
        if (!fluid) return [];
        return [[fluid.name, rec.products[0].name] as const];
      }),
  );
}
