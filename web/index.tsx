import 'preact/debug';
import { Component, render } from 'preact';
import Router from 'preact-router';
import { createHashHistory } from 'history';
import { serializeError } from "serialize-error";

import type { BlockContent } from '../scripts/load-recs';

import { IoFDetail } from './pages/objects';
import { BlockPage } from './pages/block';
import { StationStatus } from './pages/station-status';
import { WhatTheBrick } from './pages/what-the-brick';

import { JFluid, JItem, JRecipe } from './objects';
import { StationList, ItemList } from './lists';
import { LtnTree } from './ltn-tree';
import { LtnSummary, precomputeLtnSummary } from './ltn-summary';
import { Colon } from './muffler/colon';

import hashes from '../dist/hashes.json';

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

class App extends Component {
  render() {
    return (
      <div className="container">
        <div className="row">{header}</div>
        <Router history={createHashHistory() as any}>
          <Home path="/" />
          <WhatTheBrick path="/what-the-brick" />
          <StationStatus path="/station-status" />
          <IoFDetail path="/item/:name" type="item" name="from the path" />
          <IoFDetail path="/fluid/:name" type="fluid" name="from the path" />
          <BlockPage path="/block/:loc" loc="from the path" />
          <LtnTree
            path="/ltn-tree/:type/:name"
            type="item"
            name="from the path"
          />
        </Router>
      </div>
    );
  }
}

const header = (
  <header className="p-3">
    <div className="container">
      <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">
        <ul className="nav col-12 col-lg-auto me-lg-auto mb-2 justify-content-center mb-md-0">
          <li>
            <a href="/" className="nav-link px-2 text-white">
              Station / Item search
            </a>
          </li>
          <li>
            <a href="/what-the-brick" className="nav-link px-2 text-white">
              What the brick?!
            </a>
          </li>
          <li>
            <a href="/station-status" className="nav-link px-2 text-white">
              Station status
            </a>
          </li>
        </ul>
      </div>
    </div>
  </header>
);

class Home extends Component {
  render() {
    return (
      <div class="row">
        <div class="col">
          <h2>Stations</h2>
          <StationList limit={100} />
        </div>
        <div class="col">
          <h2>Items</h2>
          <ItemList limit={100} />
        </div>
      </div>
    );
  }
}

export function init(element: HTMLElement) {
  element.innerHTML = 'Loading ~10MB of unbundled JSON...';
  (async () => {
    const get = async (url: string) => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`fetch failure: ${url}: ${resp.status}`);
      return await resp.json();
    };
    await Promise.all(
      (Object.keys(data) as (keyof typeof data)[]).map(
        async (k) => {
          const key = `${k}.json` as const;
          ((data as any)[k] = await get(`../data/${key}?v=${hashes[key]}`))
        },
      ),
    );
    precompute();
    element.innerHTML = '';
    render(<App />, element);
  })().catch((e) => {
    console.error(e);
    element.innerHTML = `<pre>${JSON.stringify(serializeError(e), null, 2)}</pre>`;
  });
}

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
