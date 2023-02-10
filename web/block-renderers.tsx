import { Component } from 'preact';
import { BlockContent } from '../scripts/load-recs';
import { Item, ItemOrFluid, Recipe } from './objects';
import { RenderIcons } from './lists';
import { data } from './index';

export class Assemblers extends Component<{ asm: BlockContent['asm'] }> {
  render(props: { asm: BlockContent['asm'] }) {
    const inputs: Set<string> = new Set();
    const outputs: Set<string> = new Set();
    for (const [label] of Object.entries(props.asm)) {
      const [, recipe] = label.split('\0');
      const recp = data.recipes[recipe];
      if (!recp) continue;

      for (const ing of recp.ingredients ?? []) {
        inputs.add(`${ing.type}:${ing.name}`);
      }

      for (const prod of recp.products ?? []) {
        outputs.add(`${prod.type}:${prod.name}`);
      }
    }

    const wanted = [...inputs].filter((input) => !outputs.has(input));
    const exports = [...outputs].filter((output) => !inputs.has(output));

    const sorted = Object.entries(props.asm).sort(([, a], [, b]) => b - a);
    return (
      <>
        <ul>
          {sorted.map(([label, count]) => {
            const [machine, recipe] = label.split('\0');
            return (
              <li>
                {count} * <Item name={machine} /> making{' '}
                <Recipe name={recipe} />
              </li>
            );
          })}
        </ul>
        Wanted:
        <ul>
          {wanted.map((x) => (
            <li>{x}</li>
          ))}
        </ul>
        Exports:
        <ul>
          {exports.map((x) => (
            <li>{x}</li>
          ))}
        </ul>
      </>
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
              <RenderIcons text={stop.name} />
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
