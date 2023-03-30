import { BlockContent } from '../scripts/load-recs';
import { JFluid, JItem, JRecipe } from './objects';
import { Colon } from './muffler/colon';
import { LtnSummary, precomputeLtnSummary } from './ltn-summary';

export type Coord = readonly [number, number];
// concatenated positions; i.e. `${x},${y}`
export type ConcPos = string;

export const data = {
  doc: {} as Record<string, BlockContent>,
  items: {} as Record<string, JItem>,
  icons: {} as Record<string, string>,
  fluids: {} as Record<string, JFluid>,
  recipes: {} as {
    regular: Record<string, JRecipe>;
    voidableItems: string[];
    barrelFormOf: Record<string, string>;
    placeOverrides: Record<string, string>;
  },
  prodStats: {} as Record<
    Colon,
    { input?: FlowStats; output?: FlowStats; ltn?: number }
  >,
  trainPulses: {} as { byColon: Record<Colon, Pulse[]> },
  flowDiagrams: [] as string[],
  technologies: {} as Record<
    string,
    {
      researched: boolean;
      requires: string[];
      unlocks: string[];
    }
  >,
  cp: {} as {
    ticks: number[];
    byPos: Record<ConcPos, { runs?: number[]; recipe?: string; name?: string }>;
  },
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
