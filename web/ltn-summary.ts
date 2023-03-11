import { data } from './datae.js';
import {
  colonMapCombinator,
  colonMapItems,
  ltnMinTransfer,
  settingsMap,
} from './muffler/stations.js';
import { BlockContent } from '../scripts/load-recs.js';
import { Colon, isRegular, tupleToColon } from './muffler/colon.js';

export interface Measurement {
  actual: number;
  expected: number;
}

export interface LtnSummary {
  provides: Record<Colon, Measurement>;
  looses: Record<Colon, Measurement>;

  requests: Record<Colon, Measurement>;
}
export function precomputeLtnSummary(): Record<string, LtnSummary> {
  const ret: Record<string, LtnSummary> = {};
  for (const [loc, block] of Object.entries(data.doc)) {
    ret[loc] = ltnSummary(block);
  }
  return ret;
}

function ltnSummary(block: BlockContent): LtnSummary {
  const ret: LtnSummary = {
    looses: {},
    provides: {},
    requests: {},
  };

  for (const stop of block.stop) {
    const settings = settingsMap(stop);
    const items = colonMapItems(stop);
    const combo = colonMapCombinator(stop);
    const provides = stop.provides.map(tupleToColon).sort();
    // const allColons = [...new Set([...provides, ...Object.keys(combo), ...Object.keys(items)])].sort();
    for (const colon of provides) {
      ret.provides[colon] = {
        expected: ltnMinTransfer(colon, settings),
        actual: items[colon] ?? 0,
      };
    }

    for (const [colon, count] of Object.entries(combo)) {
      if (count >= 0) continue;
      if (!isRegular(colon)) continue;
      ret.requests[colon] = {
        expected: -count,
        actual: items[colon] - count,
      };
    }

    for (const [colon, count] of Object.entries(items)) {
      if (!count) continue;
      if (!isRegular(colon)) continue;
      if (colon in ret.requests || colon in ret.provides) continue;
      ret.looses[colon] = {
        actual: count,
        expected: ltnMinTransfer(colon, settings),
      };
    }
  }
  return ret;
}
