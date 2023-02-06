import 'preact/debug';
import { Component, render } from 'preact';

import type { BlockContent } from '../scripts/load-recs';
import type { JFluid, JItem, JRecipe } from './objects';
import { Assemblers, TrainStops } from './block-renderers';
import { ItemOrFluid } from './objects';

export const data = {
  doc: {} as unknown as Record<string, BlockContent>,
  items: {} as unknown as Record<string, JItem>,
  fluids: {} as unknown as Record<string, JFluid>,
  recipes: {} as unknown as Record<string, JRecipe>,
} as const;

class App extends Component {
  render() {
    return (
      <div>
        <h1>By block</h1>
        <ul>{blockList()}</ul>
        <h1>By ingredient</h1>
        <ul>{ingredientList()}</ul>
      </div>
    );
  }
}

function ingredientList() {
  const tagsByBlock: Record<string, string[]> = {};
  for (const [block, { tags }] of Object.entries(data.doc)) {
    tagsByBlock[block] = tags;
  }

  const blockByProduct: Record<string, Set<string>> = {};
  for (const [block, { asm }] of Object.entries(data.doc)) {
    for (const label of Object.keys(asm)) {
      const [, recipeName] = label.split('\0');
      if (recipeName === 'undefined') continue;
      const recipe = data.recipes[recipeName];
      if (!recipe) throw new Error(`bad recipe name ${recipeName}`);
      for (const product of recipe.products) {
        const packed = `${product.type}:${product.name}`;
        if (!blockByProduct[packed]) blockByProduct[packed] = new Set();
        blockByProduct[packed].add(block);
      }
    }
  }
  return Object.entries(blockByProduct)
    .sort()
    .map(([product, block]) => {
      const [type, name] = product.split(':', 2);
      return (
        <li>
          <a name={`item-${name}`} href={`#item-${name}`}>
            <ItemOrFluid name={name} type={type as any} />
          </a>{' '}
          (<span class="font-monospace">{name}</span>):
          {[...block.values()].sort().map((name) => {
            return (
              <span class="block-link">
                <a href={`#${name}`} title={tagsByBlock[name].join(', ')}>
                  {name}
                </a>
              </span>
            );
          })}
        </li>
      );
    });
}

function blockList() {
  const blocks = [];

  for (const [loc, obj] of Object.entries(data.doc)) {
    blocks.push(
      <h2>
        <a name={loc} href={'#' + loc}>
          {loc}
        </a>
      </h2>,
    );
    const list = [];
    if (obj.tags.length) {
      list.push(<li>Tags: {obj.tags.sort().join(', ')}</li>);
    }
    if (Object.keys(obj.asm).length) {
      list.push(
        <li>
          Assemblers: <Assemblers asm={obj.asm} />
        </li>,
      );
    }

    if (obj.stop.length) {
      list.push(
        <li>
          Train stops: <TrainStops stop={obj.stop} />
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
    };
    await Promise.all(
      Object.keys(data).map(
        async (k) => ((data as any)[k] = await get(`../data/${k}.json`)),
      ),
    );
    element.innerHTML = '';
    render(<App />, element);
  })().catch((e) => (element.innerHTML = e.toString()));
}
