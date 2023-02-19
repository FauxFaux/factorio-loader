import { Component } from 'preact';
import { BlockContent } from '../scripts/load-recs';
import { Item, ItemOrFluid, Recipe } from './objects';
import { RenderIcons } from './lists';
import { data } from './index';

export function recipeDifference(brick: BlockContent) {
  const inputs: Set<string> = new Set();
  const outputs: Set<string> = new Set();
  for (const [label] of Object.entries(brick.asm)) {
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

  if (brick.boilers > 0) {
    inputs.add('fluid:water');
    outputs.add('fluid:steam');
  }

  const wanted = [...inputs].filter((input) => !outputs.has(input));
  const exports = [...outputs].filter((output) => !inputs.has(output));

  return { wanted, exports };
}

export class Assemblers extends Component<{ brick: BlockContent }> {
  render(props: { brick: BlockContent }) {
    const sorted = Object.entries(props.brick.asm).sort(
      ([, a], [, b]) => b - a,
    );
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
