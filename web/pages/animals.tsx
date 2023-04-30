import { Component } from 'preact';
import { data } from '../datae';

const pens = [
  'arqad-hive',
  'arthurian-pen',
  'auog-paddock',
  'compost-plant',
  'cridren-enclosure',
  'dhilmos-pool',
  'dingrits-pack',
  'fish-farm',
  'kmauts-enclosure',
  'mukmoux-pasture',
  'phadai-enclosure',
  'phagnot-corral',
  'prandium-lab',
  'scrondrix-pen',
  'simik-den',
  'trits-reef',
  'ulric-corral',
  'vrauks-paddock',
  'xenopen',
  'xyhiphoe-pool',
  'zipir-reef',
  'vonix-den',
];

export class Animals extends Component {
  render() {
    const recp = Object.entries(data.recipes.regular).filter(
      ([name, recipe]) => recipe.producerClass === pens[0],
    );

    return <div>{JSON.stringify(recp)}</div>;
  }
}
