import { Component } from 'preact';
import { mallAssemblers, toBlueprint } from '../muffler/blueprints';
import * as blueprint from '../muffler/blueprints';

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

export class Mall extends Component {
  render() {
    const stackers = alOrder.map((name) => [
      name,
      upgrade(name, 2),
      upgrade(name, 3),
      upgrade(name, 4),
    ]);

    return (
      <textarea readonly={true} style={'width: 100%'}>
        {blueprint.encode(toBlueprint(mallAssemblers(stackers)))}
      </textarea>
    );
  }
}
