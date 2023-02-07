import 'preact/debug';
import { Component, render } from 'preact';

import type { BlockContent } from '../scripts/load-recs';
import type { JFluid, JItem, JRecipe } from './objects';
import { BigList } from './big-list';

export const data = {
  doc: {} as Record<string, BlockContent>,
  items: {} as Record<string, JItem>,
  fluids: {} as Record<string, JFluid>,
  recipes: {} as Record<string, JRecipe>,
} as const;

class App extends Component {
  render() {
    return <BigList />;
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
    element.innerHTML = '';
    render(<App />, element);
  })().catch((e) => {
    console.error(e);
    element.innerHTML = e.toString();
  });
}
