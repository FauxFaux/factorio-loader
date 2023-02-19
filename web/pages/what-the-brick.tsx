import { Component } from 'preact';

import { data } from '../index';
import { RenderIcons } from '../lists';
import { BlockThumb } from './block';
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
          {Object.entries(data.doc).map(([no, brick]) => {
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
