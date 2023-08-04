import { Component } from 'preact';
import { data } from '../datae';
import { Colon, fromColon, splitColon } from '../muffler/colon';
import {
  Action,
  inlineActions,
  intersperse,
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
import { ColonJoined } from '../objects';
import { humanise } from '../muffler/human';
import { ItemIcon } from '../lists';

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
  'item:stone-brick',
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
  'item:oil-sand',
  'item:niobium-ore',
  'item:bio-sample',
  'item:molybdenum-ore',
  'item:rare-earth-ore',
  'item:ore-quartz',
  'item:ore-nickel',
  'item:ore-aluminium',
  'item:copper-ore',
  'item:uranium-ore',
  'fluid:water-saline',
  'item:sodium-hydroxide',
  'fluid:flue-gas',
  'item:20-u-powder',
  'item:70-u-powder',
  'item:grade-4-copper',
  // made in a slab, and pulls in weird stuff like petroleum gas, which we don't make
  'fluid:syngas',
];

export class Chainer extends Component<{ wanted: string }> {
  render(props: { wanted: string }) {
    const lab = labAction(-(1 / 60) * 6);

    let actions: Record<Colon, number>[] = [];
    for (const doc of Object.values(data.doc)) {
      actions.push(
        ...toActions(
          doc.asms,
          (name, recp) =>
            (name.endsWith('-sample') &&
              // not tested
              (recp.producerClass === 'botanical-nursery' ||
                recp.producerClass === 'creature-chamber')) ||
            // auog power generation cycle
            name.includes('-recharge') ||
            name === 'vonix',
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

    const wantedList = props.wanted.split(',');
    let wantedProducts = new Set<Colon>(wantedList);
    // let wantedProducts = new Set<Colon>(['item:utility-science-pack']);
    const generations: Record<Colon, Colon[]>[] = [
      Object.fromEntries([...wantedList].map((colon) => [colon, []])),
    ];
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

    const { actions: validActions, inlines } = inlineActions(actions, []);

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
            {/*{minGeneration(action)}*/}
            <ActionList action={action} />
          </li>
        ));
    };

    const { totalConsumption, totalProduction } = actionStats(actions);

    const rate = (colon: Colon) =>
      totalConsumption[colon] / (totalProduction[colon] ?? 0);

    return (
      <div>
        <p>
          Top section. A list of items with their installed capacity for
          consumption and production, in items per second. The list is sorted
          such that items with the most missing production capacity are at the
          top. This assumes that all consumers are running at full tilt, unless
          the system has managed to prove otherwise. The top section shows
          (very) summarised production chains, 'cos otherwise the page doesn't
          load. The full list of statements is at the bottom, but not broken
          down by anything. The main fault in the proof agent is that it can't
          cope with things with multiple production paths. It <i>doesn't</i>{' '}
          inline where consumption is greater than production, as that's not how
          reality works; one consumer may be running preferentially and it
          doesn't know which.
        </p>
        {/*<p>{list(beforeInlining)}</p>*/}
        <ul>
          {Object.entries(totalConsumption)
            .filter(([colon]) => !RAW_MATERIALS.includes(colon))
            .sort(([a], [b]) => rate(b) - rate(a))
            .map(([colon, amount]) => (
              <li
                style={
                  rate(colon) <= 1
                    ? 'font-size: 80%; opacity: 80%'
                    : 'margin: 8px 0'
                }
              >
                <span style="font-weight: bold">
                  <ColonJoined colon={colon} />: {humanise(amount)} wanted,{' '}
                  {humanise(totalProduction[colon] ?? 0)} available
                </span>
                <ul>
                  {actions
                    .filter((action) => action[colon])
                    .sort((a, b) => a[colon] - b[colon])
                    .map((action) => (
                      <li>
                        <ActionList
                          action={Object.fromEntries(
                            Object.entries(action).filter(
                              ([k, v]) => v > 0 || k === colon,
                            ),
                          )}
                        />
                      </li>
                    ))}
                </ul>
              </li>
            ))}
        </ul>
        <hr />
        <h2>Surviving actions</h2>
        <p>{list(actions)}</p>
        <hr />
        <h2>Inlines</h2>
        <p>
          <ul>
            {inlines.map(({ colon, producer, efficiencies }) => (
              <li>
                <ColonJoined colon={colon} /> from{' '}
                <ActionList action={producer} /> at{' '}
                {efficiencies
                  .map((eff) => Math.round(eff * 100) + '%')
                  .join(', ')}
              </li>
            ))}
          </ul>
        </p>
      </div>
    );
  }
}

export const ActionList = (props: { action: Action }) => {
  const consumes = Object.entries(props.action).filter(([, v]) => v < 0);
  const produces = Object.entries(props.action).filter(([, v]) => v > 0);
  const compareNames = (a: Colon, b: Colon) =>
    fromColon(a)[1].localised_name.localeCompare(
      fromColon(b)[1].localised_name,
    );
  consumes.sort(([a], [b]) => compareNames(a, b));
  produces.sort(([a], [b]) => compareNames(a, b));

  // so dumb
  const icon = (colon: Colon) => {
    const [, item] = fromColon(colon);
    const [, name] = splitColon(colon);
    return (
      <>
        <ItemIcon name={name} alt={item.localised_name} />
        {item.localised_name}
      </>
    );
  };

  const countItem = (colon: Colon, count: number) => {
    if (colon.startsWith('hack:')) return <i>hack</i>;
    return (
      <>
        {humanise(count)} {icon(colon)}
      </>
    );
  };

  const consumesItems = consumes.map(([colon, count]) =>
    countItem(colon, Math.abs(count)),
  );
  const producesItems = produces.map(([colon, count]) =>
    countItem(colon, count),
  );

  return (
    <span
      style={
        'vertical-align: middle; margin: 1px; white-space: inherit; text-align: left'
      }
    >
      {intersperse(consumesItems, <> + </>)} 🠚{' '}
      {intersperse(producesItems, <> + </>)}
    </span>
  );
};
