import { Component } from 'preact';
import { computed, data } from '../datae';
import { ColonJoined } from '../objects';
import { buildMaking, productAsFloat } from '../muffler/walk-recipes';
import { Colon } from '../muffler/colon';
import { minBy } from 'lodash';

export class Whence extends Component<{ colon: string }> {
  render(props: { colon: string }) {
    const list: unknown[] = [];
    const raw = new Set([
      'fluid:water',
      'fluid:steam',
      'item:ore-zinc',
      'item:iron-ore',
      'item:ore-quartz',
      'item:ore-nickel',
      'item:ore-tin',
      'item:ore-lead',
      'item:copper-ore',
      'item:molybdenum-ore',
      'item:ore-aluminium',
      'item:limestone',
      'item:stone',
      'item:raw-borax',
      'item:biomass',
      'item:raw-coal',
      'item:sulfur',
      'item:empty-barrel',
      'item:uranium-ore',
      'fluid:oxygen',
      'fluid:hydrogen',
      'fluid:pressured-air',
      'fluid:dirty-water',
      'item:cage',
      'item:soil',
    ]);
    const waysToMake = buildMaking();

    const effects: Record<Colon, Record<Colon, number>> = {};
    for (const [colon, recipes] of Object.entries(waysToMake)) {
      if (raw.has(colon)) continue;
      const effect: Record<Colon, number> = {};
      const totalExecs = recipes.reduce(
        (a, b) => a + (computed.recipeExecs[b] ?? 0),
        0,
      );
      for (const recipe of recipes) {
        const execs = computed.recipeExecs[recipe] ?? 0;
        if (!execs) continue;
        const recp = data.recipes.regular[recipe];
        const consumesThis = recp.ingredients
          .filter((ing) => ing.colon === colon)
          .map((ing) => ing.amount)
          .reduce((a, b) => a + b, 0);
        const producesThis = recp.products
          .filter((prod) => prod.colon === colon)
          .map((prod) => productAsFloat(prod))
          .reduce((a, b) => a + b, 0);
        if (consumesThis >= producesThis) continue;
        const scale =
          (1 / (producesThis - consumesThis)) * (execs / totalExecs);
        for (const ing of recp.ingredients) {
          effect[ing.colon] = (effect[ing.colon] ?? 0) + ing.amount * scale;
        }
        for (const prod of recp.products) {
          effect[prod.colon] =
            (effect[prod.colon] ?? 0) - productAsFloat(prod) * scale;
        }
      }
      // making this consumes more of it than it makes, apparently (e.g. item:moondrop)
      if (effect[colon] > 0) continue;

      if (!Object.keys(effect).length) continue;
      effects[colon] = effect;
    }

    delete effects['item:grade-1-nickel']['item:grade-2-nickel'];
    delete effects['item:grade-1-nickel']['item:nickel-rejects'];
    delete effects['item:grade-1-lead']['item:grade-2-lead'];
    delete effects['item:grade-1-chromite']['item:grade-2-chromite'];
    delete effects['item:grade-2-chromite']['item:grade-3-chromite'];
    delete effects['item:grade-3-chromite']['item:grade-4-chromite'];
    delete effects['item:chromite-rejects'];

    effects['item:grade-1-nexelit'] = {
      'item:grade-1-nexelit': -1,
      'item:clean-nexelit': 1,
      'item:stone': 1,
    };
    effects['item:grade-1-tin'] = {
      'item:grade-1-tin': -1,
      'item:ore-tin': 5,
      'item:grade-2-tin': -0.5,
    };
    effects['item:soil'] = { 'item:soil': -1, 'fluid:water': 500 / 12 };
    effects['item:sand'] = { 'item:sand': -1, 'item:iron-stick': 2 / 10 };
    effects['fluid:carbon-dioxide'] = {
      'fluid:carbon-dioxide': -1,
      'item:biomass': 10 / 300,
    };

    const have: Record<Colon, number> = {};
    have[props.colon] = -1;
    const made: Record<Colon, number> = {};

    const TOO_SMALL = 0.001;

    for (let i = 0; i < 10_000; i++) {
      const before = { ...have };
      const someNegative = minBy(Object.entries(have), ([colon, amount]) =>
        effects[colon] ? amount : 0,
      );
      if (!someNegative) break;
      const [colon, amount] = someNegative;
      if (amount > -TOO_SMALL) break;
      made[colon] = (made[colon] ?? 0) + -amount;
      if (!effects[colon]) continue;
      for (const [ing, ingAmount] of Object.entries(effects[colon])) {
        have[ing] = (have[ing] ?? 0) + amount * ingAmount;
      }

      for (const [colon, amount] of Object.entries(have)) {
        if (Math.abs(amount) < TOO_SMALL) delete have[colon];
      }

      const errors = [];
      for (const [colon, amount] of Object.entries(have)) {
        if (amount < -TOO_SMALL && before[colon] < amount)
          errors.push(`(${colon} ${before[colon] - amount})`);
      }

      if (false)
        list.push(
          <>
            <p>
              step {i}, make {amount.toFixed(2)} {colon} by{' '}
              {Object.entries(effects[colon])
                .sort(([, a], [, b]) => a - b)
                .map(([colon, amount]) => ` (${colon} ${amount.toFixed(2)})`)}
            </p>
            <p>
              {Object.entries(have)
                .filter(([colon]) => colon in effects)
                .sort(([, a], [, b]) => a - b)
                .slice(0, 10)
                .map(([colon, amount]) => ` (${colon} ${amount.toFixed(2)})`)}
            </p>
          </>,
        );
    }

    if (false)
      for (const [colon, amount] of Object.entries(made).sort(
        ([, a], [, b]) => b - a,
      )) {
        list.push(
          <li>
            {amount.toFixed(2)}: {colon}
          </li>,
        );
      }

    for (const [colon, amount] of Object.entries(have).sort(
      ([, a], [, b]) => a - b,
    )) {
      list.push(
        <li>
          {amount.toFixed(2)}: {colon}
        </li>,
      );
    }

    // for (let i = 0; i < 5; i++) {
    //   const nextHave: Record<Colon, number> = {...have};
    //   for (const [colon, amount] of Object.entries(have)) {
    //     if (amount > Number.EPSILON) continue;
    //     const available = effects[colon];
    //     if (!available) continue;
    //     for (const [ing, ingAmount] of Object.entries(available)) {
    //       nextHave[ing] = (nextHave[ing] ?? 0) + amount * ingAmount;
    //     }
    //   }
    //   list.push(
    //     <p>
    //       {i}: {JSON.stringify(nextHave)}
    //     </p>
    //   )
    //   have = nextHave;
    // }

    if (false)
      for (const [colon, effect] of Object.entries(effects)) {
        list.push(
          <p>
            {colon}: {JSON.stringify(effect)}
          </p>,
        );
      }

    return (
      <>
        <div class="row">
          <h2>
            <ColonJoined colon={props.colon} />
          </h2>
        </div>
        <div class="row">
          <div class="col">
            <ul>{list}</ul>
          </div>
        </div>
      </>
    );
  }
}
