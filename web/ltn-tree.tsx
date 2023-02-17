import { Component } from 'preact';
import { ColonJoined } from './objects';
import { computed, data } from './index';
import { BlockLink, Colon, objToColon, splitColon } from './station-status';
import { LtnSummary, Measurement } from './ltn-summary';
import { LtnPercent } from './ltn-avail';

const nth = [
  'Primary',
  'Secondary',
  'Tertiary',
  'Quaternary',
  'Quinary',
  'Senary',
  'Septenary',
  'Octonary',
  'Nonary',
  'Denary',
];

type TreeProps = {
  type: 'item' | 'fluid';
  name: string;

  alreadySeen?: string[];
};

function getProviders(colon: string) {
  return Object.entries(computed.ltnSummary)
    .map(
      ([loc, summ]) =>
        [loc, summ, summ.provides[colon], summ.looses[colon]] as const,
    )
    .filter(([, , provide, loose]) => !!provide || !!loose)
    .sort(
      comparing(([, , provide, loose]) => {
        return provide
          ? -provide.actual / provide.expected
          : 5 + -loose.actual / loose.expected;
      }),
    );
}

export class LtnTree extends Component<TreeProps> {
  render(props: TreeProps) {
    const denyList = new Set(['item:empty-barrel', 'item:py-storehouse-mk01']);
    let toProcess = [objToColon(props)];
    const blocks = [
      <p>
        Attempt to debug why a product isn't available, under the assumption
        that every brick perfectly transforms its inputs into its outputs; that
        is, if an input is missing, it must mean because there's a "secondary"
        brick which has an input missing, and so on, until none of the bricks in
        the chain have missing inputs.
      </p>,
      <p>
        (The <span class="ltn-tree__tile--naughty">ugly background</span> means
        that the station doing the provision is not labelled as such, so may
        flicker in and out of existence. Please fix the name.)
      </p>,
    ];

    for (let i = 0; i < 10; ++i) {
      let nextRound: Colon[] = [];
      for (const colon of toProcess) {
        const providers = getProviders(colon);
        const shortages = providers
          .flatMap(([, summ]) => getShortages(summ))
          .filter(([item]) => !denyList.has(item))
          .sort(measurementZeroFirst)
          .map(([item]) => item);
        shortages.forEach((item) => denyList.add(item));
        nextRound.push(...shortages);
        blocks.push(
          <div className="row ltn-tree__header">
            <h3>
              {nth[i]} product <ColonJoined label={colon} /> could be provided
              by:
            </h3>
          </div>,
        );

        blocks.push(
          ...providers.map(([loc, summ, provide, loose]) => (
            <TreeTile
              loc={loc}
              thisProvide={provide ?? loose}
              summ={summ}
              naughty={!!loose}
            />
          )),
        );
      }

      // blocks.push(
      //   <div class="row ltn-tree__header">
      //     <h3>
      //       {i}-thary products:{' '}
      //       {nextRound.map((colon) => (
      //         <ColonJoined label={colon} />
      //       ))}
      //     </h3>
      //   </div>,
      // );

      toProcess = nextRound;
    }

    return blocks;
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
        {shortages.map(([colon, meas]) => {
          const [type, name] = splitColon(colon);
          return (
            <tr>
              <td style="text-align: right">
                <LtnPercent actual={meas.actual} expected={meas.expected} />
              </td>
              <td style="width: 15em">
                <ColonJoined label={colon} />
              </td>
              <td>
                <a
                  href={`/ltn-tree/${type}/${name}`}
                  title="focus in on this problem"
                >
                  🎯
                </a>
              </td>
            </tr>
          );
        })}
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
