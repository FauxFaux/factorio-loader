import { Component } from 'preact';
import { mallAssemblers, toBlueprint } from '../muffler/blueprints';
import * as blueprint from '../muffler/blueprints';
import range from 'lodash/range';
import { data } from '../datae';
import { makeUpRecipe } from '../muffler/walk-recipes';
import { splitColon } from '../muffler/colon';
import { isBuilding } from './recipes';
import { ColonJoined, Recipe } from '../objects';

const cpOrder = [
  'glassworks-mk01',
  'advanced-foundry-mk01',
  'automated-factory-mk01',
  'ground-borer',
  'wpu',
  'ball-mill-mk01',
  'carbon-filter',
  'classifier',
  'desulfurizator-unit',
  'distilator',
  'evaporator',
  'fluid-separator',
  'fts-reactor',
  'gasifier',
  'hpf',
  'methanol-reactor',
  'olefin-plant',
  'jaw-crusher',
  'power-house',
  'quenching-tower',
  'rectisol',
  'solid-separator',
  'tar-processing-unit',
  'washer',
];

const cpExtra = [
  'co2-absorber',
  'cooling-tower-mk01',
  'cooling-tower-mk02',
  'tailings-pond',
  'gasturbinemk01',
  'gasturbinemk02',
  // 'gasturbinemk03',
];

const alOrder = [
  'atomizer-mk01',
  'bio-printer-mk01',
  'bio-reactor-mk01',
  'biofactory-mk01',
  'creature-chamber-mk01',
  'genlab-mk01',
  'incubator-mk01',
  'micro-mine-mk01',
  'research-center-mk01',
  'slaughterhouse-mk01',
  'spore-collector-mk01',
  'botanical-nursery',
  'cadaveric-arum-mk01',
  'fawogae-plantation-mk01',
  'moondrop-greenhouse-mk01',
  'navens-culture-mk01',
  'yaedols-culture-mk01',
  'bhoddos-culture-mk01',
  'arqad-hive-mk01',
  'arthurian-pen-mk01',
  'auog-paddock-mk01',
  'compost-plant-mk01',
  'cridren-enclosure-mk01',
  'dhilmos-pool-mk01',
  'dingrits-pack-mk01',
  'ez-ranch-mk01',
  'fish-farm-mk01',
  'kmauts-enclosure-mk01',
  'mukmoux-pasture-mk01',
  'phadai-enclosure-mk01',
  'phagnot-corral-mk01',
  'prandium-lab-mk01',
  'scrondrix-pen-mk01',
  'simik-den-mk01',
  'sponge-culture-mk01',
  'trits-reef-mk01',
  'ulric-corral-mk01',
  'vrauks-paddock-mk01',
  'xenopen-mk01',
  'xyhiphoe-pool-mk01',
  'zipir-reef-mk01',
  'fwf-mk01',
  'grods-swamp-mk01',
  'kicalk-plantation-mk01',
  'moss-farm-mk01',
  'ralesia-plantation-mk01',
  'rennea-plantation-mk01',
  'sap-extractor-mk01',
  'seaweed-crop-mk01',
  'tuuphra-plantation-mk01',
  'yotoi-aloe-orchard-mk01',
  'vonix-den-mk01',
  'plankton-farm',
];

function upgrade(name: string, n: number): string {
  if (!name.endsWith('-mk01')) name += '-mk01';
  return name.replace('-mk01', `-mk0${n}`);
}

function wrapAt(names: string[], n: number): string[][] {
  const ret: string[][] = range(0, n).map(() => []);
  for (let i = 0; i < names.length; ++i) {
    ret[i % n].push(names[i]);
  }
  return ret;
}

function padToSameLength(names: string[][]): string[][] {
  const max = Math.max(...names.map((n) => n.length));
  return names.map((n) => n.concat(Array(max - n.length).fill(undefined)));
}

function stack(top: string[][], bottom: string[][]) {
  if (top.length !== bottom.length) throw new Error('length mismatch');
  top = padToSameLength(top);
  const ret: string[][] = [];
  for (let i = 0; i < top.length; ++i) {
    ret.push(top[i].concat(bottom[i]));
  }
  return ret;
}

export class Mall extends Component {
  render() {
    const cpMk01 = wrapAt(cpOrder, 10);
    const cpMk02 = wrapAt(
      cpOrder.map((name) => upgrade(name, 2)),
      10,
    );
    const cpExtraMk01 = wrapAt(cpExtra, 10);

    const alMk01 = wrapAt(alOrder, 10);
    const alMk02 = wrapAt(
      alOrder.map((name) => upgrade(name, 2)),
      10,
    );

    const cp = stack(cpMk01, stack(cpMk02, cpExtraMk01));
    const al = stack(alMk01, alMk02);

    const stackers = [...cp, ...al];

    const excuses = disableExpensive(stackers);

    return (
      <>
        <textarea readonly={true} style={'width: 100%'}>
          {blueprint.encode(toBlueprint(mallAssemblers(stackers)))}
        </textarea>
        <table class={'table'}>
          <tbody>
            {excuses.map(([recp, reason]) => (
              <tr>
                <td>
                  <Recipe name={recp} />
                </td>
                <td>
                  <ColonJoined colon={reason} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }
}

function expensive(recpName: string) {
  if (!recpName) return undefined;
  const recp = makeUpRecipe(recpName);
  if (!recp) return 'invalid';

  for (const ing of recp.ingredients) {
    if (isBuilding(ing.colon)) continue;
    const [type, name] = splitColon(ing.colon);
    if (type !== 'item') return 'fluid';
    const busHas = data.doc['0,0'].items[name];
    if (ing.amount > busHas * 0.01) return ing.colon;
  }

  return undefined;
}

function disableExpensive(stackers: string[][]): [string, string][] {
  const ret: [string, string][] = [];
  for (const row of stackers) {
    for (let i = 0; i < row.length; ++i) {
      const recp = row[i];
      const tooExpensive = expensive(recp);
      if (tooExpensive) {
        row[i] = '';
        ret.push([recp, tooExpensive]);
      }
    }
  }
  return ret;
}
