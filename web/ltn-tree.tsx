import { Component } from 'preact';
import { ColonJoined, ItemOrFluid, LtnPercent } from './objects';
import { computed, data } from './index';
import { BlockLink, Colon, objToColon } from './station-status';
import { LtnSummary, Measurement } from './ltn-summary';

export class LtnTree extends Component<{
  type: 'item' | 'fluid';
  name: string;
}> {
  render(props: { type: 'item' | 'fluid'; name: string }) {
    const colon = objToColon(props);
    const providers = Object.entries(computed.ltnSummary)
      .filter(([, summ]) => colon in summ.provides)
      .sort(
        comparing(([, summ]) => {
          const provide = summ.provides[colon];
          return -provide.actual / provide.expected;
        }),
      );
    const looses = Object.entries(computed.ltnSummary)
      .filter(([, summ]) => colon in summ.looses)
      .sort(
        comparing(([, summ]) => {
          const provide = summ.looses[colon];
          return -provide.actual / provide.expected;
        }),
      );
    return (
      <div class="row">
        <table class="table">
          <tbody>
            <tr>
              <td colSpan={3}>
                <h3>
                  <ColonJoined label={colon} /> could be provided by:
                </h3>
              </td>
            </tr>
            {providers.map(([loc, summ]) => (
              <TreeTile
                loc={loc}
                thisProvide={summ.provides[colon]}
                summ={summ}
                naughty={false}
              />
            ))}
            {looses.map(([loc, summ]) => (
              <TreeTile
                loc={loc}
                thisProvide={summ.looses[colon]}
                summ={summ}
                naughty={true}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

const TreeTile = (p: {
  loc: string;
  thisProvide: Measurement;
  summ: LtnSummary;
  naughty: boolean;
}) => {
  return (
    <tr class={p.naughty ? 'ltn-tree--naughty' : ''}>
      <td>
        <LtnPercent
          actual={p.thisProvide.actual}
          expected={p.thisProvide.expected}
        />
      </td>
      <td>
        <BlockLink loc={p.loc} /> {data.doc[p.loc].tags.sort().join(', ')}
      </td>
      <td>
        <Shortages requests={p.summ.requests} />
      </td>
    </tr>
  );
};

const Shortages = (p: { requests: Record<Colon, Measurement> }) => {
  const shortages = Object.entries(p.requests).filter(
    ([, meas]) => meas.actual / meas.expected < 0.5,
  );
  if (0 === shortages.length) {
    return (
      <p>No apparent shortages ({Object.keys(p.requests).length} requests).</p>
    );
  }
  return (
    <table style="width: 20em">
      <tbody>
        {shortages.sort(measurementZeroFirst).map(([colon, meas]) => (
          <tr>
            <td style="text-align: right">
              <LtnPercent actual={meas.actual} expected={meas.expected} />
            </td>
            <td>
              <ColonJoined label={colon} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

function comparing<T>(extract: (t: T) => number): (a: T, b: T) => number {
  return (a, b) => extract(a) - extract(b);
}

function measurementZeroFirst(
  [, a]: [string, Measurement],
  [, b]: [string, Measurement],
): number {
  return b.expected / b.actual - a.expected / a.actual;
}
