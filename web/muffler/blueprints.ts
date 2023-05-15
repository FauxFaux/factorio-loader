import { atob, btoa } from 'abab';
import pako from 'pako';
import _chunk from 'lodash/chunk';
import { Colon, splitColon, tupleToColon } from './colon';
import { makeUpRecipe, RecipeName } from './walk-recipes';
import { Factory, FactoryClass } from '../datae';

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
  // e.g. { speed_module: 6 } for factories, not an inventory apparently
  items?: Record<string, number>;
  position?: unknown;
  recipe?: string;
  direction?: number;
  // massively over-specified
  control_behavior?: {
    logistic_condition: {
      first_signal: {
        type: 'item';
        name: string;
      };
      constant: number;
      comparator: '<';
    };
    connect_to_logistic_network: true;
  };
  // e.g. power poles
  neighbours?: number[];

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

export function buildRequestFilters(input: Record<Colon, number>) {
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
  chestName = 'logistic-chest-requester',
): Blueprint {
  const justChest = {
    index: 1,
    signal: {
      name: chestName,
      type: 'item',
    },
  };
  return {
    entities: [
      {
        entity_number: 1,
        name: chestName,
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

export function toBlueprint(entities: Entity[]): Blueprint {
  return {
    entities: entities.map((entity, entity_number) => ({
      ...entity,
      entity_number: entity_number + 1,
    })),
    item: 'blueprint',
    version: 281479275151360,
  };
}

function ingredientMap(recp: string): Record<Colon, number> {
  if (!recp) return {};
  return Object.fromEntries(
    makeUpRecipe(recp)?.ingredients?.map(
      (ing) => [ing.colon, ing.amount] as const,
    ) ?? [],
  );
}

function mergeReq(
  leftReq: Record<string, number>,
  rightReq: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [name, amount] of Object.entries(leftReq)) {
    result[name] = (result[name] ?? 0) + amount;
  }
  for (const [name, amount] of Object.entries(rightReq)) {
    result[name] = (result[name] ?? 0) + amount;
  }
  return result;
}

function roundUpFour(n: number) {
  return Math.ceil(n / 4) * 4;
}

function roundUpReq(req: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(req).map(
      ([name, amount]) => [name, roundUpFour((amount + 1) * 1.1)] as const,
    ),
  );
}

function onlyProduct(recp: string) {
  const recpD = makeUpRecipe(recp);
  const products = recpD?.products ?? [];
  if (1 !== products.length)
    throw new Error(
      `need exactly one product for ${recp}: ${JSON.stringify(recpD)}`,
    );
  return splitColon(products[0].colon)[1];
}

export function mallAssemblers(recipes: RecipeName[][]): Entity[] {
  let x = 0;
  let y = 0;
  const entities: Entity[] = [];
  let lastPole: number | undefined;
  for (const [leftStack, rightStack] of _chunk(recipes, 2)) {
    lastPole = undefined;
    for (let stackItem = 0; stackItem < leftStack.length; ++stackItem) {
      const leftRecp: RecipeName | undefined = leftStack[stackItem];
      const rightRecp: RecipeName | undefined = rightStack?.[stackItem];
      const leftReq = ingredientMap(leftRecp);
      const rightReq = ingredientMap(rightRecp);
      const req = roundUpReq(mergeReq(leftReq, rightReq));

      if (leftRecp) {
        entities.push({
          name: 'assembling-machine-2',
          position: { x, y },
          recipe: leftRecp,
        });
        entities.push({
          name: 'stack-inserter',
          position: { x: x + 2, y },
          // inserting to the right
          direction: 2,
        });
        entities.push({
          name: 'inserter',
          position: { x: x + 2, y: y - 1 },
          // inserting to the left
          direction: 6,
          control_behavior: {
            logistic_condition: {
              first_signal: {
                type: 'item',
                name: onlyProduct(leftRecp),
              },
              constant: 5,
              comparator: '<',
            },
            connect_to_logistic_network: true,
          },
        });
      }
      if (Object.entries(req).length !== 0) {
        entities.push({
          name: 'logistic-chest-requester',
          request_filters: buildRequestFilters(req),
          position: { x: x + 3, y },
        });
      }
      if (rightRecp) {
        entities.push({
          name: 'stack-inserter',
          position: { x: x + 4, y },
          // inserting to the left
          direction: 6,
        });
        entities.push({
          name: 'assembling-machine-2',
          position: { x: x + 6, y },
          recipe: rightRecp,
        });
        entities.push({
          name: 'inserter',
          position: { x: x + 4, y: y - 1 },
          // inserting to the right
          direction: 2,
          control_behavior: {
            logistic_condition: {
              first_signal: {
                type: 'item',
                name: onlyProduct(rightRecp),
              },
              constant: 5,
              comparator: '<',
            },
            connect_to_logistic_network: true,
          },
        });
      }
      if (leftRecp || rightRecp) {
        entities.push({
          name: 'logistic-chest-passive-provider',
          position: { x: x + 3, y: y - 1 },
        });
      }
      entities.push({
        name: 'small-electric-pole',
        position: { x: x + 3, y: y + 1 },
        neighbours: lastPole ? [lastPole] : undefined,
      });
      // XXX sensitive to entities order
      lastPole = entities.length;
      y += 3;
    }
    y = 0;
    x += 9;
  }

  return entities;
}

export function stripProducer(p: Factory): FactoryClass {
  return p
    .replace(/-?mk0\d|-\d$/, '')
    .replace('assembling-machine', 'automated-factory')
    .replace(
      /advanced-foundry|electric-furnace|steel-furnace|stone-furnace/,
      'furnace',
    )
    .replace('pumpjack-hightech', 'pumpjack');
}

export function stripProducers(producers: Factory[]): FactoryClass[] {
  return [...new Set(producers.map((p) => stripProducer(p)))].sort();
}
