import { Component } from 'preact';
import { data, Loc } from '../datae';
import { Stop } from '../../scripts/load-recs';
import { settingsMap } from '../muffler/stations';
import { GpsLink, RenderIcons } from '../lists';
import { cloneDeep } from 'lodash';
import { BlockLink } from './station-status';

export class StationConfig extends Component {
  render() {
    interface Station {
      loc: Loc;
      stop: Stop;
      // kind: 'p' | 'r' | undefined;
      // threshItem: number | undefined;
      // threshStack: number | undefined;
    }

    const allStations: Station[] = [];

    for (const [loc, { stop: stops }] of Object.entries(data.doc)) {
      for (const stop of stops) {
        allStations.push({
          loc,
          stop,
        });
      }
    }

    const settingNames = [
      'ltn-provider-threshold',
      'ltn-provider-stack-threshold',
      'ltn-requester-threshold',
      'ltn-requester-stack-threshold',
      'ltn-requester-priority',
      'ltn-network-id',
      'ltn-provider-priority',
      'ltn-disable-warnings',
      'ltn-depot',
      'ltn-depot-priority',
      'ltn-max-trains',
      'ltn-max-train-length',
    ] as const;

    return (
      <div class={'row'}>
        <div class={'col'}>
          <table class={'table station-config'}>
            <thead>
              <tr>
                <th>Station</th>
                {settingNames.map((name) => (
                  <th>{name.replace(/^ltn-/, '').replace(/-/g, ' ')}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {allStations.map((s) => {
                const settings = settingsMap(s.stop);
                const cells = [
                  <td>
                    <GpsLink caption={s.stop.name} gps={s.stop.gps} />
                    <BlockLink loc={s.loc} /> <RenderIcons text={s.stop.name} />
                  </td>,
                ];

                const rest = { ...settings };
                for (const known of settingNames) {
                  let naughty = false;
                  naughty ||=
                    known === 'ltn-requester-stack-threshold' &&
                    s.stop.provides.length === 0 &&
                    (settings[known] ?? 0) < 1;
                  naughty ||=
                    known === 'ltn-provider-stack-threshold' &&
                    s.stop.provides.length !== 0 &&
                    (settings[known] ?? 0) < 1;
                  cells.push(
                    <td class={naughty ? 'station-config--naughty' : ''}>
                      {settings[known]}
                    </td>,
                  );
                  delete rest[known];
                }

                return (
                  <tr>
                    {cells}
                    {/*<td>*/}
                    {/*  <ul>*/}
                    {/*    {Object.entries(rest).map(([k, v]) => (*/}
                    {/*      <li>*/}
                    {/*        {k}: {v}*/}
                    {/*      </li>*/}
                    {/*    ))}*/}
                    {/*  </ul>*/}
                    {/*</td>*/}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}
