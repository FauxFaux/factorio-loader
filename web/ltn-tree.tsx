import { Component } from 'preact';
import { ColonJoined, LtnPercent } from './objects';
import { computed, data } from './index';
import { BlockLink, Colon, objToColon, splitColon } from './station-status';
import { LtnSummary, Measurement } from './ltn-summary';

const denyList = new Set(['item:empty-barrel', 'item:py-storehouse-mk01']);

type TreeProps = {
  type: 'item' | 'fluid';
  name: string;

  alreadySeen?: string[];
};

export class LtnTree extends Component<TreeProps> {
  render(props: TreeProps) {
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
    const shortages = providers
      .flatMap(([, summ]) => getShortages(summ))
      .sort(measurementZeroFirst);
    if (0 === shortages.length) {
      shortages.push(
        ...looses
          .flatMap(([, summ]) => getShortages(summ))
          .sort(measurementZeroFirst),
      );
    }
    const interestingShortages = shortages.filter(
      ([item]) =>
        !(props.alreadySeen ?? []).includes(item) && !denyList.has(item),
    );
    const alreadySeen = [
      ...(props.alreadySeen ?? []),
      ...shortages.map(([item]) => item),
    ];

    return (
      <>
        <div class="row ltn-tree__header">
          <h3>
            <ColonJoined label={colon} /> could be provided by:
          </h3>
        </div>
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
        {interestingShortages.length ? (
          <p>
            From this, I'm inferring that there's a shortage of{' '}
            {interestingShortages.join(', ')}.
          </p>
        ) : (
          <></>
        )}
        {interestingShortages.map(([item]) => {
          const [type, name] = splitColon(item);
          return (
            <LtnTree type={type as any} name={name} alreadySeen={alreadySeen} />
          );
        })}
      </>
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
    <div
      class={
        'row ltn-tree__tile ' + (p.naughty ? 'ltn-tree__tile--naughty' : '')
      }
    >
      <div class="col-md-1" style="text-align: right">
        <LtnPercent
          actual={p.thisProvide.actual}
          expected={p.thisProvide.expected}
        />
      </div>
      <div class="col-md-7">
        <BlockLink loc={p.loc} /> {data.doc[p.loc].tags.sort().join(', ')}
      </div>
      <div class="col-md-4">
        <Shortages requests={p.summ.requests} />
      </div>
    </div>
  );
};

function getShortages(summ: { requests: Record<Colon, Measurement> }) {
  return Object.entries(summ.requests)
    .filter(([, meas]) => meas.actual / meas.expected < 0.5)
    .sort(measurementZeroFirst);
}

const Shortages = (p: { requests: Record<Colon, Measurement> }) => {
  const shortages = getShortages(p);
  if (0 === shortages.length) {
    return (
      <p>No apparent shortages ({Object.keys(p.requests).length} requests).</p>
    );
  }
  return (
    <table class="table table-borderless">
      <tbody>
        {shortages.map(([colon, meas]) => (
          <tr>
            <td style="text-align: right">
              <LtnPercent actual={meas.actual} expected={meas.expected} />
            </td>
            <td style="width: 15em">
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
