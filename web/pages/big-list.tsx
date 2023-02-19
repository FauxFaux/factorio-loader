import { Component } from 'preact';

import { Item } from '../objects';
import { Assemblers, TrainStops } from '../block-renderers';
import { data } from '../index';
import { fromBlock } from '../../scripts/magic';
import { humanise } from '../muffler/human';

export class BlockThumb extends Component<{ loc: string }> {
  render(props: { loc: string }) {
    let [lxs, lys] = props.loc.split(',');
    const lx = parseInt(lxs);
    const ly = parseInt(lys);
    const [bx, by] = fromBlock([lx, ly]);
    let [mx, my] = [bx, by];
    // offset in screenshot command in notes.lua
    my -= 768;
    // dunno where this comes from, but easy-ish to measure from the screenshot; what does 0.04 mean in tiles/pixel?
    const scale = 1.27;
    mx *= scale;
    my *= scale;
    mx += 2048;
    my += 2048;
    return (
      <a href={`https://factorio.lorier.net/mar2022/#1/nauvis/18/${bx}/${by}`}>
        <span
          style={`display: inline-block; width: 250px; height: 166px; background: url('../data/screenshot.jpg') -${mx}px -${my}px`}
        />
      </a>
    );
  }
}

export class BlockPage extends Component<{ loc: string }> {
  render(props: { loc: string }) {
    const loc = props.loc;
    const obj = data.doc[loc];
    const list = [];
    list.push(<BlockThumb loc={loc} />);
    if (obj.tags.length) {
      list.push(<li>Tags: {obj.tags.sort().join(', ')}</li>);
    }
    if (Object.keys(obj.asm).length) {
      list.push(
        <li>
          Assemblers: <Assemblers brick={obj} />
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

    if (Object.keys(obj.items).length !== 0) {
      list.push(
        <li>
          Storing:
          <ul>
            {Object.entries(obj.items)
              .sort(([, a], [, b]) => b - a)
              .map(([name, count]) => (
                <li>
                  {humanise(count)} * <Item name={name} />
                </li>
              ))}
          </ul>
        </li>,
      );
    }

    return (
      <p>
        <h2>{loc}</h2>
        {list}
      </p>
    );
  }
}
