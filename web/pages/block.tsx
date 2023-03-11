import { Component } from 'preact';

import { ColonJoined, Item, ItemOrFluid, TagList } from '../objects.js';
import { Assemblers, recipeDifference, TrainStops } from '../block-renderers.js';
import { data } from '../datae.js';
import { humanise } from '../muffler/human.js';
import { BlockThumb } from './map.js';

export class BlockPage extends Component<{ loc: string }> {
  render(props: { loc: string }) {
    const loc = props.loc;
    const obj = data.doc[loc];
    if (!obj) {
      return (
        <div>
          No block at {loc} (maybe it was merged, which isn't currently
          supported, sorry!)
        </div>
      );
    }
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
                  <ColonJoined colon={x} />
                </li>
              ))}
            </ul>
            <h3 title="..but does not produce">Consumes</h3>
            <ul>
              {wanted.map((x) => (
                <li>
                  <ColonJoined colon={x} />
                </li>
              ))}
            </ul>
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
            <h3>Resources</h3>
            <ul>
              {Object.entries(obj.resources).map(([name, count]) => (
                <li>
                  {humanise(count)} * <Item name={name} />
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
