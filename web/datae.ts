import { BlockContent } from '../scripts/load-recs';
import { FRecipe, JFluid, JItem, JRecipe } from './objects';
import { Colon } from './muffler/colon';
import { LtnSummary, precomputeLtnSummary } from './ltn-summary';
import { makeUpRecipe } from './muffler/walk-recipes';

export type Coord = readonly [number, number];
// concatenated positions; i.e. `${x},${y}`
export type ConcPos = string;

// e.g. `automated-factory`
export type FactoryClass = string;
// e.g. `automated-factory-mk01`
export type Factory = string;

export type Limitation = string;

export const data = {
  doc: {} as Record<string, BlockContent>,
  meta: {} as {
    factories: Record<
      FactoryClass,
      Record<
        Factory,
        { speed: number; modules: number; dims: [number, number] }
      >
    >;
    modules: Record<Limitation, Record<string, number>>;
    isSpawn: Loc[];
  },
  /** @deprecated replace with colons */
  items: {} as Record<string, JItem>,
  icons: {} as Record<string, string>,
  /** @deprecated replace with colons */
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
  maps: {} as {
    maps: MapRef[];
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
  /** fluid -> item ({ "fetal-serum": "fetal-serum-barrel" }) */
  fluidBarrel: {} as Record<string, string>,
  /** item -> fluid ({ "fetal-serum-barrel": "fetal-serum" }) */
  barrelFluid: {} as Record<string, string>,
  recipeExecs: {} as Record<string, number>,
  recipes: [] as FRecipe[],
};

export type Loc = string;
/** from, to, start, duration, amount */
export type Pulse = [Loc, Loc, number, number, number];

export interface MapRef {
  date: string;
  tick: number;
  speed: number;
  trains: number;
  researchName: string;
  researchProgress: number;
  hasMap: boolean;
}

export function precompute() {
  computed.ltnSummary = precomputeLtnSummary();
  computed.fluidBarrel = data.recipes.barrelFormOf;
  computed.barrelFluid = Object.fromEntries(
    Object.entries(computed.fluidBarrel).map(([k, v]) => [v, k] as const),
  );

  for (const dat of Object.values(data.cp.byPos)) {
    if (!(dat.recipe && dat.runs)) {
      continue;
    }
    computed.recipeExecs[dat.recipe] =
      (computed.recipeExecs[dat.recipe] ?? 0) +
      (dat.runs.reduce((a, b) => a + b, 0) ?? 0);
  }

  computed.recipes = Object.keys(data.recipes.regular)
    .map((name) => makeUpRecipe(name))
    .filter((r): r is FRecipe => !!r);
}
