import { Component } from 'preact';
import { BlockContent } from '../scripts/load-recs';
import { Item, ItemOrFluid, Recipe } from './objects';

export class Assemblers extends Component<{ asm: BlockContent['asm'] }> {
  render(props: { asm: BlockContent['asm'] }) {
    const sorted = Object.entries(props.asm).sort(([, a], [, b]) => b - a);
    return (
      <ul>
        {sorted.map(([label, count]) => {
          const [machine, recipe] = label.split('\0');
          return (
            <li>
              {count} * <Item name={machine} /> making <Recipe name={recipe} />
            </li>
          );
        })}
      </ul>
    );
  }
}

export class TrainStops extends Component<{ stop: BlockContent['stop'] }> {
  render(props: { stop: BlockContent['stop'] }) {
    return (
      <ul>
        {props.stop.map((stop) => {
          const nonVirt = stop.items
            .sort(([, , a], [, , b]) => Math.abs(b) - Math.abs(a))
            .filter(([kind]) => kind !== 'virtual');
          return (
            <li>
              {stop.name}
              <ul>
                {nonVirt.map(([kind, name, count]) => (
                  <li>
                    {count} * <ItemOrFluid type={kind as any} name={name} />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    );
  }
}
