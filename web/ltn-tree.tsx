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
      <>
        <div class="row">
          <h3>
            <ItemOrFluid name={props.name} type={props.type} /> could be
            provided by:
          </h3>
        </div>
        <div className="row">
          {providers.map(([loc, summ]) => (
            <TreeTile
              loc={loc}
              thisProvide={summ.provides[colon]}
              summ={summ}
            />
          ))}
        </div>
        {looses.length ? (
          <div className="row">
            <h3>
              <ItemOrFluid name={props.name} type={props.type} /> is also
              available from NOT APPROVED stations in...
            </h3>
            {looses.map(([loc, summ]) => (
              <TreeTile
                loc={loc}
                thisProvide={summ.looses[colon]}
                summ={summ}
              />
            ))}
          </div>
        ) : (
          <></>
        )}
      </>
    );
  }
}

const TreeTile = (p: {
  loc: string;
  thisProvide: Measurement;
  summ: LtnSummary;
}) => {
  return (
    <div class="tree-tile">
      <h4>
        <LtnPercent
          actual={p.thisProvide.actual}
          expected={p.thisProvide.expected}
        />{' '}
        from <BlockLink loc={p.loc} /> {data.doc[p.loc].tags.sort().join(', ')}
      </h4>
      <Shortages requests={p.summ.requests} />
    </div>
  );
};

const Shortages = (p: { requests: Record<Colon, Measurement> }) => {
  const shortages = Object.entries(p.requests).filter(
    ([, meas]) => meas.actual / meas.expected < 0.5,
  );
  if (0 === shortages.length) {
    return (
      <p>
        No apparent shortages, all {Object.keys(p.requests).length} requests are
        satisfied.
      </p>
    );
  }
  return (
    <table>
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
