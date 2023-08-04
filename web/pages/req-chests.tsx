import { Component } from 'preact';
import { Coord, data } from '../datae';
import { GpsLink } from '../lists';
import { stacks } from './chestify';
import { ColonJoined } from '../objects';
import { distSq } from '../muffler/stations';
import { RecipeName } from '../muffler/walk-recipes';

export class ReqChests extends Component<{ brick: string }> {
  render(props: { brick: string }) {
    const brick = data.doc[props.brick];
    const locs: [Coord, RecipeName][] = [];
    for (const [, recipe, , loc] of brick.asms) {
      if (!recipe) continue;
      locs.push([loc, recipe]);
    }

    const nearest = (loc: Coord) => {
      let best: [RecipeName, number] = ['???', Infinity];
      for (const [other, recipe] of locs) {
        const dist = distSq(loc, other);
        if (dist < best[1]) best = [recipe, dist];
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
