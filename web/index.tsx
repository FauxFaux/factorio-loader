import 'preact/debug';
import { Component, render } from 'preact';

import type { BlockContent } from '../scripts/load-recs';
import type { JFluid, JItem, JRecipe } from './objects';
import { Assemblers, TrainStops } from './block-renderers';

export const data = {
  doc: {} as unknown as Record<string, BlockContent>,
  items: {} as unknown as Record<string, JItem>,
  fluids: {} as unknown as Record<string, JFluid>,
  recipes: {} as unknown as Record<string, JRecipe>,
} as const;

class App extends Component {
  render() {
    return <ul>{blockList()}</ul>;
  }
}

function blockList() {
  const blocks = [];

  for (const [loc, obj] of Object.entries(data.doc)) {
    blocks.push(
      <h1>
        <a name={loc} href={'#' + loc}>
          {loc}
        </a>
      </h1>,
    );
    const list = [];
    if (obj.tags.length) {
      list.push(<li>Tags: {obj.tags.sort().join(', ')}</li>);
    }
    if (Object.keys(obj.asm).length) {
      list.push(
        <li>
          Assemblers: <Assemblers asm={obj.asm}/>
        </li>,
      );
    }

    if (obj.stop.length) {
      list.push(
        <li>
          Train stops: <TrainStops stop={obj.stop}/>
        </li>,
      );
    }
    blocks.push(list);
  }
  return blocks;
}

export function init(element: HTMLElement) {
  element.innerHTML = 'dealing with json because webpack is too stupid';
  (async () => {
    const get = async (url: string) => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`fetch failure: ${url}: ${resp.status}`);
      return await resp.json();
    }
    await Promise.all(Object.keys(data).map(async (k) => (data as any)[k] = await get(`../data/${k}.json`)));
    element.innerHTML = '';
    render(<App />, element);
  })().catch((e) => element.innerHTML = e.toString());
}
