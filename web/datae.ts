import { BlockContent } from '../scripts/load-recs.js';
import { JFluid, JItem, JRecipe } from './objects.js';
import { Colon } from './muffler/colon.js';
import { LtnSummary, precomputeLtnSummary } from './ltn-summary.js';

export type Coord = readonly [number, number];

export const data = {
  doc: {} as Record<string, BlockContent>,
  items: {} as Record<string, JItem>,
  icons: {} as Record<string, string>,
  fluids: {} as Record<string, JFluid>,
  recipes: {} as {
    regular: Record<string, JRecipe>;
    voidableItems: string[];
    barrelFormOf: Record<string, string>;
  },
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
  /** total ever made/consumed */
  total: number;
  /** 5s, ... 100h */
  perTime: number[];
}

export const computed = {
  ltnSummary: {} as Record<string, LtnSummary>,
  fluidBarrel: {} as Record<string, string>,
  barrelFluid: {} as Record<string, string>,
};

export type Loc = string;
/** from, to, start, duration, amount */
export type Pulse = [Loc, Loc, number, number, number];

export function precompute() {
  computed.ltnSummary = precomputeLtnSummary();
  computed.fluidBarrel = data.recipes.barrelFormOf;
  computed.barrelFluid = Object.fromEntries(
    Object.entries(computed.fluidBarrel).map(([k, v]) => [v, k] as const),
  );
}
