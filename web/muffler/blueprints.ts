import { atob, btoa } from 'abab';
import pako from 'pako';
import { Colon, splitColon, tupleToColon } from './colon';

export interface Blueprint {
  entities?: Entity[];
  tiles?: { name: string; position?: unknown }[];

  icons?: unknown[];

  // from the map version
  version: number;

  item: 'blueprint';

  // incomplete
}

export interface Entity {
  entity_number?: number;

  // presumably always an item; this is *not* colon'd
  name: string;
  inventory?: unknown;
  position?: unknown;

  request_filters?: { name: string; count: number; index?: number }[];
}

export function decode(data: string): Blueprint {
  if (data[0] !== '0') throw new Error(`unsupported version ${data[0]}`);
  const un64 = Uint8Array.from(atob(data.slice(1))!, (c) => c.charCodeAt(0));
  const obj = JSON.parse(pako.inflate(un64, { to: 'string' }));
  const keys = Object.keys(obj);
  if (keys.length !== 1 || keys[0] !== 'blueprint')
    throw new Error(`invalid top level: ${keys}`);
  return obj.blueprint as Blueprint;
}

export function encode(blueprint: Blueprint): string {
  const obj = {
    blueprint,
  };
  const un64 = pako.deflate(JSON.stringify(obj), { level: 9 });
  return '0' + btoa(String.fromCharCode(...un64));
}

export function enumerate(input: Blueprint): Record<Colon, number> {
  const result: Record<Colon, number> = {};
  for (const entity of input.entities ?? []) {
    const colon = tupleToColon(['item', entity.name]);
    result[colon] = (result[colon] ?? 0) + 1;
  }
  return result;
}

export function buildRequestFilters(input: Record<string, number>) {
  return Object.entries(input).map(([colon, count], i) => {
    const [, name] = splitColon(colon);
    return {
      count,
      index: i + 1,
      name,
    };
  });
}

export function toChest(
  reference: Blueprint,
  input: Record<Colon, number>,
): Blueprint {
  const justChest = {
    index: 1,
    signal: {
      name: 'logistic-chest-requester',
      type: 'item',
    },
  };
  return {
    entities: [
      {
        entity_number: 1,
        name: 'logistic-chest-requester',
        position: {
          x: 0,
          y: 0,
        },
        request_filters: buildRequestFilters(input),
      },
    ],
    icons: [justChest],
    item: 'blueprint',
    version: input.version,
  };
}
