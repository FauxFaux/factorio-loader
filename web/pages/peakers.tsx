import _partition from 'lodash/partition';
import { Component, JSX } from 'preact';
import { computed, data } from '../datae';
import { Colon, fromColon, splitColon } from '../muffler/colon';
import { ActionPill, mergeDuplicateActions2, toActions } from './block';
import { isBuilding } from './recipes';
import { ColonJoined } from '../objects';
import { humanise } from '../muffler/human';

export class Peakers extends Component {
  render() {
    let actions: Record<Colon, number>[] = [];
    for (const doc of Object.values(data.doc)) {
      actions.push(...toActions(doc.asms));
    }

    actions = mergeDuplicateActions2(
      actions
        .map((action) => embedBarrelling(action))
        .map((action) => embedCages(action)),
    )
      .map((action) => removeNearlyZeroEntries(action))
      // remove pure sinks (oxygen -> null), it must have some output
      .filter((action) => Object.values(action).some((x) => x > 0))
      .filter((action) => !makesExcluded(action))
      .filter((action) => Object.keys(action).length >= 1);

    const scienceRate = -(1 / 60) * 6;
    actions.push(labAction(scienceRate));

    const consumed = objectsConsumed(actions);

    consumed.add('hack:victory');

    // const [validActions, excluded] = _partition(actions, (action) =>
    //   Object.entries(action)
    //     .filter(([, amount]) => amount > 0)
    //     .some(([colon]) => consumed.has(colon)),
    // );
    // actions = validActions;
    const { totalProduction, totalConsumption } = actionStats(actions);

    totalConsumption['hack:victory'] = -scienceRate;

    const byColon: Record<Colon, Record<Colon, number>[]> = {};
    for (const action of actions) {
      for (const colon of Object.keys(action)) {
        byColon[colon] ||= [];
        byColon[colon].push(action);
      }
    }

    const error = (colon: Colon) => {
      const prod = totalProduction[colon] ?? 0;
      const cons = totalConsumption[colon] ?? 0;
      return prod - cons; // ((prod + cons) / 2);
    };

    const actionSummary = (colon: Colon, actions: Record<Colon, number>[]) => {
      const prod = totalProduction[colon] ?? 0;
      const cons = totalConsumption[colon] ?? 0;
      let [makes, consumes] = _partition(
        actions,
        (action) => action[colon] > 0,
      );
      const sort = (actions: Record<Colon, number>[]) =>
        actions.sort((a, b) => {
          const aAmount = a[colon] ?? 0;
          const bAmount = b[colon] ?? 0;
          return bAmount - aAmount;
        });

      makes = sort(makes);
      consumes = sort(consumes).reverse();

      const rower = (filtered: Record<Colon, number>[], total: number) => {
        if (filtered.length === 0) return null;
        const built: JSX.Element[] = [];
        let processed = 0;
        for (const action of filtered) {
          const share = Math.abs(action[colon] / total);
          if (share < 0.05) continue;
          processed += share;
          built.push(
            <div>
              {(share * 100).toFixed(0)}% <ActionPill action={action} />
            </div>,
          );
          if (processed > 0.8) break;
        }
        const remain = filtered.length - built.length;
        if (remain) {
          built.push(
            <div>
              ...and {remain} more doing ~{((1 - processed) * 100).toFixed(0)}%
            </div>,
          );
        }
        return built;
      };

      return (
        <>
          <td>{rower(makes, prod)}</td>
          <td>{rower(consumes, cons)} </td>
        </>
      );
    };

    const rows = Object.entries(byColon)
      .sort(([colonA], [colonB]) => {
        const a = error(colonA);
        const b = error(colonB);
        return a - b;
      })
      .slice(0, 200)
      .map(([colon, actions]) => (
        <tr>
          <td>
            <ColonJoined colon={colon} />
          </td>
          <td style={'text-align: right'}>
            {humanise(totalProduction[colon] ?? 0)}
          </td>
          <td style={'text-align: right'}>
            {humanise(totalConsumption[colon] ?? 0)}
          </td>
          {actionSummary(colon, actions)}
        </tr>
      ));

    return (
      <>
        <table class={'table'}>
          <tbody>{rows}</tbody>
        </table>
      </>
    );
  }
}

export function embedBarrelling(
  orig: Record<Colon, number>,
): Record<Colon, number> {
  const action = { ...orig };
  for (const [colon, amount] of Object.entries(orig)) {
    const [kind, name] = splitColon(colon);
    if (kind !== 'item') continue;
    const fluidForm = computed.barrelFluid[name];
    if (!fluidForm) continue;
    const fluidColon = `fluid:${fluidForm}`;
    action[fluidColon] = (action[fluidColon] || 0) + amount * 50;
    action['item:empty-barrel'] = (action['item:empty-barrel'] || 0) + amount;
    delete action[colon];
  }

  return action;
}

const caging: Record<Colon, Colon> = {
  'item:caged-arthurian': 'item:arthurian',
  'item:caged-auog': 'item:auog',
  'item:caged-dingrits': 'item:dingrits',
  'item:caged-kmauts': 'item:kmauts',
  'item:caged-korlex': 'item:korlex',
  'item:caged-mukmoux': 'item:mukmoux',
  'item:caged-phadai': 'item:phadai',
  'item:caged-phagnot': 'item:phagnot',
  'item:caged-scrondrix': 'item:scrondrix',
  'item:caged-simik': 'item:simik',
  'item:caged-ulric': 'item:ulric',
  'item:caged-vrauks': 'item:vrauks',
  'item:caged-xeno': 'item:xeno',
};

export function embedCages(orig: Record<Colon, number>): Record<Colon, number> {
  const action = { ...orig };
  for (const [colon, amount] of Object.entries(orig)) {
    const uncaged = caging[colon];
    if (!uncaged) continue;
    action[uncaged] = (action[uncaged] || 0) + amount;
    action['item:cage'] = (action['item:cage'] || 0) + amount;
    delete action[colon];
  }

  return action;
}

export function removeNearlyZeroEntries(action: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(action).filter(([colon, amount]) => Math.abs(amount) > 1e-9),
  );
}

export function actionMakes(action: Record<string, number>) {
  return Object.entries(action)
    .filter(([, amount]) => amount > 0)
    .map(([colon]) => colon);
}

export function actionConsumes(action: Record<string, number>) {
  return Object.entries(action)
    .filter(([, amount]) => amount < 0)
    .map(([colon]) => colon);
}

function makesExcluded(action: Record<Colon, number>) {
  const makes = actionMakes(action);
  if (makes.length !== 1) return false;
  const made = makes[0];
  if (
    [
      'item:small-lamp',
      'item:pipe',
      'item:stone-wall',
      'item:piercing-rounds-magazine',
      'item:firearm-magazine',
    ].includes(made)
  )
    return false;
  if (
    [
      'item:ht-locomotive',
      'item:ht-generic-wagon',
      'item:ht-generic-fluid-wagon',
      'item:ht-pipes',
      'item:ht-pipes-to-ground',
      'item:niobium-pipe-to-ground',
      'item:py-logistic-robot-01',
      'item:py-logistic-robot-02',
    ].includes(made)
  )
    return true;
  if (isBuilding(makes[0])) return true;
  const [, item] = fromColon(made);
  if (item.subgroup.name === 'py-alienlife-special-creatures') return true;
  // logistics: belts, pumps, etc.
  // production: mines, pumps, accumulators, repair packs, modules, etc.
  // combat: turrets, walls, guns, bullets, etc.
  return ['logistics', 'production', 'combat'].includes(item.group.name);
}

export function labAction(scienceRate: number): Record<Colon, number> {
  return {
    'item:automation-science-pack': scienceRate,
    'item:chemical-science-pack': scienceRate,
    'item:military-science-pack': scienceRate,
    'item:production-science-pack': scienceRate,
    'item:space-science-pack': scienceRate,
    'item:utility-science-pack': scienceRate,
    'item:logistic-science-pack': scienceRate,
    'hack:victory': -scienceRate,
  };
}

export function objectsConsumed(actions: Record<Colon, number>[]) {
  return new Set(
    actions.flatMap((action) =>
      Object.entries(action)
        .filter(([colon, amount]) => amount < 0)
        .map(([colon]) => colon),
    ),
  );
}

export function actionStats(actions: Record<Colon, number>[]) {
  const totalProduction: Record<Colon, number> = {};
  for (const action of actions) {
    for (const [colon, amount] of Object.entries(action)) {
      if (amount < 0) continue;
      totalProduction[colon] = (totalProduction[colon] || 0) + amount;
    }
  }

  const totalConsumption: Record<Colon, number> = {};
  for (const action of actions) {
    for (const [colon, amount] of Object.entries(action)) {
      if (amount > 0) continue;
      totalConsumption[colon] =
        (totalConsumption[colon] || 0) + Math.abs(amount);
    }
  }
  return { totalProduction, totalConsumption };
}
