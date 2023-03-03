import { Stop } from '../../scripts/load-recs';
import { Colon, fromColon, tupleToColon } from './colon';
import { data } from '../datae';
import { cleanupName, closelyMatches } from './names';

export function isProvideStation(name: string): boolean {
  return !!/\bProvide\b/i.exec(name);
}

export function provideStationPurpose(name: string): Set<string> {
  const matches = new Set<string>();
  for (const ma of name.matchAll(/\[item=([a-z0-9-]+)]/g)) {
    const item = ma[1];
    if (item in data.items) {
      matches.add(item);
    }
  }

  if (matches.size) return matches;
  name = cleanupName(name);
  let ma = name.match(/^([a-zA-Z0-9 /-]+) Provide/i);
  if (ma) {
    for (const part of ma[1].split('/')) {
      const guess = closelyMatches(part);
      if (guess) {
        matches.add(guess);
      }
    }
  }
  return matches;
}

export type Stat = readonly [string, Stop];

export function stations(): Stat[] {
  return Object.entries(data.doc).flatMap(([loc, brick]) =>
    brick.stop.map((stop) => [loc, stop] as const),
  );
}

export function itemMap(stop: Stop): Record<string, number> {
  return Object.fromEntries(
    stop.items
      .filter(([kind]) => kind === 'item')
      .map(([, name, value]) => [name, value] as const),
  );
}

export function colonMapItems(stop: Stop): Record<Colon, number> {
  return Object.fromEntries(
    stop.items
      .filter(([kind]) => kind !== 'virtual')
      .map(
        ([type, name, value]) => [tupleToColon([type, name]), value] as const,
      ),
  );
}
export function colonMapCombinator(stop: Stop): Record<Colon, number> {
  return Object.fromEntries(
    stop.combinator.map(
      ([type, name, value]) => [tupleToColon([type, name]), value] as const,
    ),
  );
}

interface LtnSettings {
  'ltn-provider-stack-threshold'?: number;
  'ltn-provider-threshold'?: number;

  // there are other options here, they're present in the data but I have not mapped them
}

export function settingsMap(stop: Stop): LtnSettings {
  return Object.fromEntries(
    stop.settings
      .filter(([kind, name]) => kind === 'virtual' && name.startsWith('ltn-'))
      .map(([, name, value]) => [name, value] as const),
  );
}

export function ltnMinTransfer(colon: Colon, settings: LtnSettings) {
  const [type, item] = fromColon(colon);
  const expectedByStack =
    type === 'item'
      ? item.stack_size * (settings['ltn-provider-stack-threshold'] ?? 10)
      : 0;
  const expectedByCount = settings['ltn-provider-threshold'] ?? 1;
  return Math.max(expectedByStack, expectedByCount);
}
