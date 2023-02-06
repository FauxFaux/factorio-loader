import 'preact/debug';
import { Component, render } from 'preact';

import docData from '../data/data.json';
import { BlockContent } from '../scripts/load-recs';
import { Assemblers, TrainStops } from './block-renderers';
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
    return <ul>{blocks}</ul>;
  }
}

export function init(element: HTMLElement) {
  element.innerHTML = '';
  render(<App />, element);
}
