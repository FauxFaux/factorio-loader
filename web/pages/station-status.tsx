import { Component } from 'preact';

import { data } from '../datae.js';
import { Stop } from '../../scripts/load-recs.js';
import { GpsLink, RenderIcons } from '../lists.jsx';
import { ColonJoined } from '../objects.jsx';
import { tupleToColon } from '../muffler/colon.js';
import {
  colonMapItems,
  ltnMinTransfer,
  settingsMap,
  Stat,
  stations,
} from '../muffler/stations.js';

export class StationStatus extends Component {
  render() {
    const stops = stations();

    const providers: Stat[] = [];
    const requesters: Stat[] = [];
    const boring: Stat[] = [];
    const bugs: Stat[] = [];

    for (const [loc, stop] of stops) {
      if (
        /empty barrel/i.exec(stop.name) ||
        /storehouse provide/i.exec(stop.name) ||
        /passenger stop/.exec(stop.name) ||
        /virtual-signal=ltn-depot/.exec(stop.name)
      ) {
        boring.push([loc, stop]);
      } else if (stop.provides.length > 0) {
        providers.push([loc, stop]);
      } else if (/\b(?:Request|drop)\b/i.exec(stop.name)) {
        requesters.push([loc, stop]);
      } else {
        bugs.push([loc, stop]);
      }
    }

    const providerObjs = providers.map(([loc, stop]) => {
      const declaring = stop.provides;

      const settings = settingsMap(stop);

      const available = colonMapItems(stop);

      const health: Record<string, number> = {};

      for (const tuple of declaring) {
        const colon = tupleToColon(tuple);
        health[colon] =
          (available[colon] ?? 0) / ltnMinTransfer(colon, settings);
      }

      return { stop: [loc, stop], health, available, settings } as const;
    });

    return (
      <>
        <div className="row">
          <h2>Provider-like things</h2>
          <p>
            Congratulations on waiting for this page to load! This shows the{' '}
            <i>percentage satisfaction</i> of a train by a provider. If the
            stack size is 5, and the LTN stack requirement is 10, a train is
            assumed to want 50 items. If there are 40 items present, the
            satisfaction is 40/50 = 80%. If there are 500 items present, the
            satisfaction is 1,000%.
          </p>
          <table class="wtb">
            {providerObjs
              .sort(({ health: a }, { health: b }) => {
                return (
                  Math.min(...Object.values(a)) - Math.min(...Object.values(b))
                );
              })
              .map(({ stop, health, available, settings }) => (
                <tr>
                  <td>
                    <StopLine stop={stop} />
                  </td>
                  <td>
                    <table>
                      {Object.entries(health)
                        .sort(([, a], [, b]) => a - b)
                        .map(([colon, health]) => (
                          <tr>
                            <td>
                              {(health * 100).toLocaleString('en', {
                                maximumFractionDigits: 0,
                              })}
                              %
                            </td>
                            <td>
                              <ColonJoined colon={colon} />
                            </td>
                          </tr>
                        ))}
                    </table>
                  </td>
                  {/*{JSON.stringify(available)}*/}
                  {/*{JSON.stringify(settings)}*/}
                </tr>
              ))}
          </table>
        </div>
        <div class="row">
          <h2>Names not matching a known pattern</h2>
          <ul>
            {bugs.map((stop) => (
              <li>
                <StopLine stop={stop} />
              </li>
            ))}
          </ul>
        </div>
        <div class="row">
          <h2>Names deemed too boring to consider</h2>
          <ul>
            {boring.map((stop) => (
              <li>
                <StopLine stop={stop} />
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  }
}

export class StopLine extends Component<{ stop: readonly [string, Stop] }> {
  render(props: { stop: [string, Stop] }) {
    const stop = props.stop[1];
    const loc = props.stop[0];
    return (
      <span>
        <GpsLink caption={stop.name} gps={stop.gps} />{' '}
        <RenderIcons text={stop.name} /> (<BlockLink loc={loc} />)
      </span>
    );
  }
}

export class BlockLink extends Component<{ loc: string }> {
  render(props: { loc: string }) {
    return (
      <a
        href={`/block/${props.loc}`}
        title={data.doc[props.loc].tags.sort().join(', ')}
      >
        {props.loc}
      </a>
    );
  }
}
