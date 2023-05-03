import { JFluid, JItem } from '../objects';
import { data } from '../datae';

export type Colon = string;

export function getColon(colon: Colon): JItem | JFluid {
  if (colon.startsWith('item:')) return data.items[colon.slice('item:'.length)];
  if (colon.startsWith('fluid:'))
    return data.fluids[colon.slice('fluid:'.length)];
  throw new Error(`invalid colon ${colon}`);
}

export function splitColon(colon: Colon): ['item' | 'fluid', string] {
  const splut = colon.split(':', 2);
  // if I've caught you out by not validating your input, you deserve a ha ha
  if (splut.length === 2) return splut as ['item' | 'fluid', string];
  throw new Error(`invalid colon ${colon}`);
}

export function fromColon(key: string): ['item', JItem] | ['fluid', JFluid] {
  if (key.startsWith('item:')) {
    return ['item', data.items[key.slice('item:'.length)]];
  }

  if (key.startsWith('fluid:')) {
    return ['fluid', data.fluids[key.slice('fluid:'.length)]];
  }

  throw new Error(`invalid colon'd name: "${key}"`);
}

export function tupleToColon([type, name]: [string, string]): Colon {
  return `${type}:${name}`;
}

export function objToColon(p: { type: string; name: string }): Colon {
  return `${p.type}:${p.name}`;
}

export function isRegular(colon: Colon): boolean {
  return colon.startsWith('item:') || colon.startsWith('fluid:');
}
