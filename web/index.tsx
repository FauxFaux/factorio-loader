import 'preact/debug';
import { Component, render } from 'preact';
import Router from 'preact-router';
import { createHashHistory } from 'history';

import type { BlockContent } from '../scripts/load-recs';

import { IoFDetail } from './pages/objects';
import { BigList, BlockPage } from './pages/big-list';
import { JFluid, JItem, JRecipe } from './objects';
import { StationList, ItemList } from './lists';
import { WhatTheBrick } from './what-the-brick';
import { StationStatus } from './station-status';
import { LtnTree } from './ltn-tree';
import { LtnSummary, precomputeLtnSummary } from './ltn-summary';

export const data = {
  doc: {} as Record<string, BlockContent>,
  items: {} as Record<string, JItem>,
  icons: {} as Record<string, string>,
  fluids: {} as Record<string, JFluid>,
  recipes: {} as Record<string, JRecipe>,
  technologies: {} as Record<
    string,
    {
      researched: boolean;
      requires: string[];
      unlocks: string[];
    }
  >,
} as const;

export const computed = {
  ltnSummary: {} as Record<string, LtnSummary>,
};

class App extends Component {
  render() {
    return (
      <div className="container">
        <div className="row">{header}</div>
        <Router history={createHashHistory() as any}>
          <Home path="/" />
          <BigList path="/big" />
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
          <li>
            <a href="/big" className="nav-link px-2 text-white">
              Big ol' dump
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
  element.innerHTML = 'dealing with json because webpack is too stupid';
  (async () => {
    const get = async (url: string) => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`fetch failure: ${url}: ${resp.status}`);
      return await resp.json();
    };
    await Promise.all(
      Object.keys(data).map(
        async (k) => ((data as any)[k] = await get(`../data/${k}.json`)),
      ),
    );
    precompute();
    element.innerHTML = '';
    render(<App />, element);
  })().catch((e) => {
    console.error(e);
    element.innerHTML = e.toString();
  });
}

export function precompute() {
  computed.ltnSummary = precomputeLtnSummary();
}
