import { Component } from 'preact';
import { data } from '../datae';
import { Colon } from '../muffler/colon';
import {
  Action,
  inlineActions,
  mergeDuplicateActions2,
  toActions,
} from './block';
import {
  actionConsumes,
  actionMakes,
  embedBarrelling,
  embedCages,
  labAction,
  removeNearlyZeroEntries,
} from './peakers';

export class Chainer extends Component {
  render() {
    const lab = labAction(-(1 / 60) * 6);

    let actions: Record<Colon, number>[] = [];
    for (const doc of Object.values(data.doc)) {
      actions.push(...toActions(doc.asms));
    }
    actions.push(lab);

    actions = mergeDuplicateActions2(
      actions
        .map((action) => embedBarrelling(action))
        .map((action) => embedCages(action)),
    )
      .map((action) => {
        const cleaned = { ...action };
        delete cleaned['fluid:water'];
        delete cleaned['fluid:steam'];
        delete cleaned['fluid:dirty-water'];
        delete cleaned['item:gravel'];
        delete cleaned['item:stone'];
        delete cleaned['item:sand'];
        delete cleaned['item:soil'];
        delete cleaned['item:biomass'];
        delete cleaned['item:ash'];
        delete cleaned['item:moss'];
        return cleaned;
      })
      .map((action) => removeNearlyZeroEntries(action))
      // remove pure sinks (oxygen -> null), it must have some output
      .filter((action) => Object.values(action).some((x) => x > 0));

    actions = mergeDuplicateActions2(actions);

    let wantedProducts = new Set<Colon>(['hack:victory']);
    const generations: string[][] = [];
    while (true) {
      const start = new Set([...wantedProducts]);
      const newProducts = new Set<Colon>();
      for (const action of actions) {
        const makes = actionMakes(action);
        if (!makes.some((colon) => wantedProducts.has(colon))) continue;
        for (const input of actionConsumes(action)) {
          newProducts.add(input);
        }
      }

      for (const product of newProducts) {
        wantedProducts.add(product);
      }

      const generation = [...wantedProducts].filter((x) => !start.has(x));
      if (generation.length === 0) break;
      generations.push(generation);
    }

    actions = actions.filter((action) => {
      const makes = actionMakes(action);
      return makes.some((colon) => wantedProducts.has(colon));
    });

    const { actions: validActions } = inlineActions(actions, []);

    const generationNumbers = Object.fromEntries(
      generations.flatMap((generation, i) =>
        generation.map((colon) => [colon, i + 1]),
      ),
    );

    // return generations.map((generation) => <p><ul>
    //   {generation.map((colon) => <li><ColonJoined colon={colon}/></li>)}
    // </ul></p>);

    const minGeneration = (action: Record<Colon, number>) => {
      const makes = actionMakes(action);
      return Math.min(...makes.map((colon) => generationNumbers[colon])) || 0;
    };

    return validActions
      .sort((a, b) => {
        const byGen = minGeneration(a) - minGeneration(b);
        if (byGen !== 0) return byGen;
        const byName = Object.keys(a)[0].localeCompare(Object.keys(b)[0]);
        return byName;
      })
      .map((action) => (
        <li>
          {minGeneration(action)}
          <Action action={action} />
        </li>
      ));
  }
}
