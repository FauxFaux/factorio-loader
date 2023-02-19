import { Component } from 'preact';

import { ColonJoined, Item, ItemOrFluid, TagList } from '../objects';
import { Assemblers, recipeDifference, TrainStops } from '../block-renderers';
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

    const { wanted, exports } = recipeDifference(obj);

    return (
      <>
        <div class="row">
          <h2>
            {loc} (<TagList tags={obj.tags} />)
          </h2>
        </div>
        <div class="row">
          <div class="col">
            <BlockThumb loc={loc} />
            <h3>Train stops</h3>
            <TrainStops stop={obj.stop} />
          </div>
          <div class="col">
            <h3 title="..but does not consume">Produces</h3>
            <ul>
              {exports.map((x) => (
                <li>
                  <ColonJoined label={x} />
                </li>
              ))}
            </ul>
            <h3 title="..but does not produce">Consumes</h3>
            <ul>
              {wanted.map((x) => (
                <li>
                  <ColonJoined label={x} />
                </li>
              ))}
            </ul>
          </div>
          <div class="col">
            <h3>Storing</h3>
            <ul>
              {[
                ...Object.entries(obj.items).map(
                  ([k, v]) => [k, v, 'item'] as const,
                ),
                ...Object.entries(obj.fluids).map(
                  ([k, v]) => [k, v, 'fluid'] as const,
                ),
              ]
                .sort(([, a], [, b]) => b - a)
                .map(([name, count, type]) => (
                  <li>
                    {humanise(count)} * <ItemOrFluid type={type} name={name} />
                  </li>
                ))}
            </ul>
          </div>
        </div>
        <div class="row">
          <h3>Assemblers</h3>
          <Assemblers brick={obj} />
        </div>
      </>
    );
  }
}
