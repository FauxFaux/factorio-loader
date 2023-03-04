import { Component } from 'preact';

import { data } from '../datae';
import { RenderIcons } from '../lists';
import { BlockThumb } from './map';
import { recipeDifference } from '../block-renderers';
import { ColonJoined } from '../objects';
import { compareWithoutIcons } from '../muffler/names';

export class WhatTheBrick extends Component {
  render() {
    return (
      <div class="row">
        <table class="wtb">
          <tr>
            <th>no</th>
            <th>thumb</th>
            <th>tags</th>
            <th>stations</th>
            <th>doesn't make but consumes</th>
            <th>doesn't want but produces</th>
          </tr>
          {Object.entries(data.doc)
            .filter(
              ([, brick]) =>
                brick.tags.length > 0 ||
                brick.stop.length > 0 ||
                Object.keys(brick.asm).length > 0,
            )
            .sort(([, ba], [, bb]) => {
              const a = ba.tags.length;
              const b = bb.tags.length;
              if (!a && !b) return 0;
              if (!a) return 1;
              if (!b) return -1;
              const fewerTags = a - b;
              if (fewerTags) return fewerTags;
              return compareWithoutIcons(ba.tags[0], bb.tags[0]);
            })
            .map(([no, brick]) => {
              const { wanted, exports } = recipeDifference(brick);
              return (
                <tr>
                  <td>
                    <a href={`/block/${no}`}>{no}</a>
                  </td>
                  <td>
                    <BlockThumb loc={no} />
                  </td>
                  <td>
                    <ul>
                      {brick.tags.sort(compareWithoutIcons).map((tag) => (
                        <li>
                          <RenderIcons text={tag} />
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul>
                      {brick.stop.map((tag) => (
                        <li>
                          <RenderIcons text={tag.name} />
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul>
                      {wanted.sort().map((pair) => (
                        <li>
                          <ColonJoined label={pair} />
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul>
                      {exports.sort().map((pair) => (
                        <li>
                          <ColonJoined label={pair} />
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
        </table>
      </div>
    );
  }
}
