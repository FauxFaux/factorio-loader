import 'preact/debug';
import { Component, render } from 'preact';

import docData from '../data/data.json';
import { BlockContent } from '../scripts/load-recs';
import { Item, ItemOrFluid, Recipe } from './objects';
const doc = docData as unknown as Record<string, BlockContent>;

class App extends Component {
  render() {
    const blocks = [];

    for (const [loc, obj] of Object.entries(doc)) {
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
        const sorted = Object.entries(obj.asm).sort(([, a], [, b]) => b - a);

        list.push(
          <li>
            Assemblers:
            <ul>
              {sorted.map(([label, count]) => {
                const [machine, recipe] = label.split('\0');
                return (
                  <li>
                    {count} * <Item name={machine} /> making{' '}
                    <Recipe name={recipe} />
                  </li>
                );
              })}
            </ul>
          </li>,
        );
      }

      if (obj.stop.length) {
        list.push(
          <li>
            Train stops
            <ul>
              {obj.stop.map((stop) => {
                const nonVirt = stop.items
                  .sort(([, , a], [, , b]) => Math.abs(b) - Math.abs(a))
                  .filter(([kind]) => kind !== 'virtual');
                return (
                  <li>
                    {stop.name}
                    <ul>
                      {nonVirt.map(([kind, name, count]) => (
                        <li>
                          {count} *{' '}
                          <ItemOrFluid type={kind as any} name={name} />
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </li>,
        );
      }
      blocks.push(list);
    }
    return <ul>{blocks}</ul>;
  }
}

export function init(element: HTMLElement) {
  element.innerHTML = '';
  render(<App />, element);
}
