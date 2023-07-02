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
  actionStats,
  embedBarrelling,
  embedCages,
  labAction,
  removeNearlyZeroEntries,
} from './peakers';
import { cloneDeep } from 'lodash';
import { ColonJoined } from '../objects';

// remove evidence of the production of these things, so the work actions are not reported
const RAW_MATERIALS: Colon[] = [
  'item:steel-plate',
  'fluid:molten-steel',
  'item:aluminium-plate',
  'fluid:molten-aluminium',
  'item:copper-plate',
  'fluid:molten-copper',
  'item:silver-plate',
  'item:nexelit-plate',
  'item:tin-plate',
  'fluid:molten-tin',
  'item:molybdenum-plate',
  'item:iron-plate',
  'fluid:molten-iron',
  'item:chromium',
  'fluid:molten-chromium',
  'item:rubber',
  'item:diamond',
  'item:chromite-sand',
  'item:sulfur',
  'item:sodium-sulfate',
  'fluid:molten-solder',
  'item:lead-plate',
  'item:zinc-plate',
  'item:titanium-plate',
  'item:limestone',
  'fluid:molten-nickel',
  // angry about "cold air", which is nothing to do with liquid nitrogen
  'fluid:nitrogen',
  'item:latex',
  'fluid:molten-glass',
  'fluid:hot-air',
  'item:casein',
  'item:coal',
  'item:coke',
  'item:coal-dust',
  'fluid:tar',
  'fluid:aromatics',
  'fluid:boric-acid',
  'item:sodium-sulfate',
  'item:fertilizer',
  'item:raw-borax',
  'fluid:water-saline',
  'item:sodium-hydroxide',
  'fluid:flue-gas',
  // made in a slab, and pulls in weird stuff like petroleum gas, which we don't make
  'fluid:syngas',
];

export class Chainer extends Component {
  render() {
    const lab = labAction(-(1 / 60) * 6);

    let actions: Record<Colon, number>[] = [];
    for (const doc of Object.values(data.doc)) {
      actions.push(
        ...toActions(
          doc.asms,
          (name, recp) =>
            (name.endsWith('-sample') &&
              // not tested
              recp.producerClass === 'botanical-nursery') ||
            recp.producerClass === 'creature-chamber',
        ),
      );
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
        delete cleaned['fluid:waste-water'];
        delete cleaned['fluid:oxygen'];
        delete cleaned['fluid:hydrogen'];
        delete cleaned['fluid:carbon-dioxide'];
        delete cleaned['item:gravel'];
        delete cleaned['item:stone'];
        delete cleaned['item:sand'];
        delete cleaned['item:soil'];
        delete cleaned['item:biomass'];
        delete cleaned['item:ash'];
        delete cleaned['item:moss'];
        // breaking weird cycles (e.g. fungal substrate doesn't 'produce' empty petri dishes)
        delete cleaned['item:empty-petri-dish'];

        for (const colon of RAW_MATERIALS) {
          if ((cleaned[colon] ?? 0) > 0) delete cleaned[colon];
        }

        return cleaned;
      })
      .map((action) => removeNearlyZeroEntries(action))
      // remove pure sinks (oxygen -> null), it must have some output
      .filter((action) => Object.values(action).some((x) => x > 0));

    actions = mergeDuplicateActions2(actions);

    // let wantedProducts = new Set<Colon>(['hack:victory']);
    let wantedProducts = new Set<Colon>(['item:logistic-science-pack']);
    const generations: Record<Colon, Colon[]>[] = [];
    while (true) {
      const start = new Set([...wantedProducts]);
      const newProducts: Record<Colon, Colon[]> = {};
      for (const action of actions) {
        const makes = actionMakes(action);
        if (!makes.some((colon) => wantedProducts.has(colon))) continue;
        for (const input of actionConsumes(action)) {
          newProducts[input] = makes;
        }
      }

      for (const product of Object.keys(newProducts)) {
        wantedProducts.add(product);
      }

      const generation = [...wantedProducts].filter((x) => !start.has(x));
      if (generation.length === 0) break;
      generations.push(
        Object.fromEntries(
          generation.map((colon) => [colon, newProducts[colon]]),
        ),
      );
    }

    actions = actions.filter((action) => {
      const makes = actionMakes(action);
      return makes.some((colon) => wantedProducts.has(colon));
    });

    const beforeInlining = cloneDeep(actions);
    const { actions: validActions } = inlineActions(actions, []);

    actions = validActions.map((action) => removeNearlyZeroEntries(action));

    const generationNumbers = Object.fromEntries(
      generations.flatMap((generation, i) =>
        Object.keys(generation).map((colon) => [colon, i + 1]),
      ),
    );

    // iron oxide from complex chemicals, borax from sea sponges, fuel rods from silver, silver for any animal
    // we really need a concept of "fundamental", i.e. steel is produced magically but not ignored
    // return generations.map((generation) => (
    //   <p>
    //     <ul>
    //       {Object.entries(generation).map(([what, why]) => (
    //         <li>
    //           <ColonJoined colon={what} /> from {why.map(oh => <ColonJoined colon={oh}/>)}
    //         </li>
    //       ))}
    //     </ul>
    //   </p>
    // ));

    const minGeneration = (action: Record<Colon, number>) => {
      const makes = actionMakes(action);
      return (
        Math.min(
          ...makes.map((colon) => generationNumbers[colon] ?? Infinity),
        ) || Infinity
      );
    };

    const list = (actions: Record<Colon, number>[]) => {
      return actions
        .sort((a, b) => {
          const byGen = minGeneration(a) - minGeneration(b);
          if (byGen !== 0) return byGen;
          return Object.keys(a)[0].localeCompare(Object.keys(b)[0]);
        })
        .map((action) => (
          <li>
            {minGeneration(action)}
            <Action action={action} />
          </li>
        ));
    };

    const { totalConsumption, totalProduction } = actionStats(actions);

    return (
      <div>
        {/*<p>{list(beforeInlining)}</p>*/}
        <ul>
          {Object.entries(totalConsumption)
            .filter(([colon]) => !RAW_MATERIALS.includes(colon))
            .map(([colon, amount]) => (
              <li>
                <ColonJoined colon={colon} />: {amount}
              </li>
            ))}
        </ul>
        <p>{list(actions)}</p>
      </div>
    );
  }
}
