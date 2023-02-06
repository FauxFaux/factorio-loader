import 'preact/debug';
import { Component, render } from 'preact';

import * as docData from '../data/data.json';
import { BlockContent } from '../scripts/load-recs';
const doc = docData as Record<string, BlockContent>;

class App extends Component {
  render() {
    const blocks = [];

    for (const [loc, obj] of Object.entries(doc)) {
      blocks.push(
        <h1>
          <a name="${loc}" href="#${loc}">
            ${loc}
          </a>
        </h1>,
      );
      const list = [];
      if (obj.tags.length) {
        list.push(<li>Tags: ${obj.tags.sort().join(', ')}</li>);
      }
      if (Object.keys(obj.asm).length) {
        const asmList = [];
        for (const [label, count] of Object.entries(obj.asm).sort(
          ([, a], [, b]) => b - a,
        )) {
          asmList.push(
            <li>
              ${count} * ${label}
            </li>,
          );
        }

        list.push(
          <li>
            Assemblers: <ul>${asmList}</ul>
          </li>,
        );
      }

      if (obj.stop.length) {
        list.push(
          <>
            <li>Train stops</li>
            <ul>
              {obj.stop.map((stop) => {
                const nonVirt = stop.items
                  .sort(([, , a], [, , b]) => Math.abs(b) - Math.abs(a))
                  .filter(([kind]) => kind !== 'virtual');
                return (
                  <li>
                    ${stop.name}
                    <ul>
                      {nonVirt.map(([kind, name, count]) => (
                        <li>
                          ${count} * ${kind}:${name}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </>,
        );
      }
      blocks.push(list);
    }
    return (
      <ul>{blocks}</ul>
    );
  }
}

export function init(element: HTMLElement) {
  element.innerHTML = '';
  render(<App />, element);
}
