import { Component } from 'preact';
import { Coord, data } from '../datae';
import { GpsLink } from '../lists';
import { stacks } from './chestify';
import { ColonJoined } from '../objects';
import { distSq } from '../muffler/stations';

export class ReqChests extends Component<{ brick: string }> {
  render(props: { brick: string }) {
    const brick = data.doc[props.brick];
    const locs: [Coord, string][] = [];
    for (const [label, { locations }] of Object.entries(brick.asm)) {
      for (const loc of locations) {
        locs.push([loc, label.split('\0', 2)[1]]);
      }
    }

    const nearest = (loc: Coord) => {
      let best: [string, number] = ['???', Infinity];
      for (const [other, label] of locs) {
        const dist = distSq(loc, other);
        if (dist < best[1]) best = [label, dist];
      }
      return best;
    };

    const totalStacks = (items: Record<string, number>) =>
      Object.entries(items)
        .map(([name, count]) => stacks(`item:${name}`, count))
        .reduce((a, b) => a + b, 0);
    return (
      <table class={'table'}>
        <thead>
          <tr>
            <th>Location</th>
            <th>'Nearby' factory is making</th>
            <th>Fill</th>
            <th>Contents</th>
          </tr>
        </thead>
        <tbody>
          {brick.requesters
            .sort(([, a], [, b]) => totalStacks(b) - totalStacks(a))
            .map(([gps, stuff]) => (
              <tr>
                <td>
                  <GpsLink caption={'requester chest'} gps={gps} />
                </td>
                <td>{data.recipes.regular[nearest(gps)[0]]?.localised_name}</td>
                <td>{((100 * totalStacks(stuff)) / 48).toFixed()}%</td>
                <td>
                  {Object.entries(stuff)
                    .sort(([, a], [, b]) => b - a)
                    .map(([name, count]) => (
                      <li>
                        <span className={'amount'}>{count}</span> &times;{' '}
                        <ColonJoined colon={`item:${name}`} />
                      </li>
                    ))}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    );
  }
}
