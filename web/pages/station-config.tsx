import { Component } from 'preact';
import { data, Loc } from '../datae';
import { Stop } from '../../scripts/load-recs';
import { LtnSettings, settingsMap } from '../muffler/stations';
import { GpsLink, ItemIcon, RenderIcons } from '../lists';
import { BlockLink } from './station-status';

const allSettingNames = [
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

interface ConfigState {
  sort: (typeof allSettingNames)[number];
  reverse: boolean;
  includeProvs: boolean;
  includeReqs: boolean;
  extraCols: boolean;
}

export class StationConfig extends Component<{}, ConfigState> {
  state = {
    sort: 'ltn-requester-stack-threshold' as const,
    reverse: false,
    includeProvs: false,
    includeReqs: true,
    extraCols: false,
  };

  render(props: {}, state: ConfigState) {
    interface Station {
      loc: Loc;
      stop: Stop;
      settings: LtnSettings;
      kind: 'r' | 'p' | 'd';
    }

    const settingNames: readonly (typeof allSettingNames)[number][] =
      state.extraCols
        ? allSettingNames
        : ([
            'ltn-provider-threshold',
            'ltn-provider-stack-threshold',
            'ltn-requester-threshold',
            'ltn-requester-stack-threshold',
            'ltn-requester-priority',
            'ltn-network-id',
            'ltn-provider-priority',
          ] as const);

    const allStations: Station[] = [];

    for (const [loc, { stop: stops }] of Object.entries(data.doc)) {
      for (const stop of stops) {
        const settings = settingsMap(stop);
        allStations.push({
          loc,
          stop,
          settings,
          kind: settings['ltn-depot'] ? 'd' : stop.provides.length ? 'p' : 'r',
        });
      }
    }

    return (
      <div class={'row'}>
        <div class={'col'}>
          <table class={'table station-config'}>
            <thead>
              <tr>
                <th>
                  <label>
                    <input
                      type={'checkbox'}
                      checked={state.includeProvs}
                      onChange={(e) =>
                        this.setState({ includeProvs: e.currentTarget.checked })
                      }
                    />{' '}
                    Providers
                  </label>
                  <br />
                  <label>
                    <input
                      type={'checkbox'}
                      checked={state.includeReqs}
                      onChange={(e) =>
                        this.setState({ includeReqs: e.currentTarget.checked })
                      }
                    />{' '}
                    Requesters
                  </label>
                  <br />
                  Station
                </th>
                <th>type</th>
                <th>
                  <label>
                    <input
                      type={'checkbox'}
                      checked={state.extraCols}
                      onChange={(e) =>
                        this.setState({ extraCols: e.currentTarget.checked })
                      }
                    />{' '}
                    more cols
                  </label>
                  <br />
                  items
                </th>
                {settingNames.map((name) => (
                  <th
                    class={
                      'station-config-sorter ' +
                      (state.sort === name
                        ? 'station-config-sorter-active'
                        : '')
                    }
                    onClick={() => {
                      if (state.sort === name) {
                        this.setState({ reverse: !state.reverse });
                      } else {
                        this.setState({ sort: name, reverse: false });
                      }
                    }}
                  >
                    <abbr title={name}>
                      {name
                        .replace(/^ltn-/, '')
                        .replace(/-/g, ' ')
                        .replace(/(?: |^)(.{3})[^ ]*/g, '$1 ')}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {allStations
                .filter((s) => {
                  if (s.kind === 'p') {
                    return state.includeProvs;
                  }
                  if (s.kind === 'r') {
                    return state.includeReqs;
                  }
                  return !state.includeProvs && !state.includeReqs;
                })
                .sort((a, b) => {
                  const aVal = a.settings[state.sort] ?? 0;
                  const bVal = b.settings[state.sort] ?? 0;
                  return state.reverse ? bVal - aVal : aVal - bVal;
                })
                .map((s) => {
                  const settings = settingsMap(s.stop);
                  const cells = [
                    <td>
                      <GpsLink caption={s.stop.name} gps={s.stop.gps} />
                      <BlockLink loc={s.loc} />{' '}
                      <RenderIcons text={s.stop.name} />
                    </td>,
                    <td>{s.kind}</td>,
                    <td>
                      {s.stop.provides.map(([type, name]) => (
                        <ItemIcon
                          name={name}
                          alt={`provides ${type}:${name}`}
                        />
                      ))}
                      <hr />
                      {s.stop.combinator
                        .filter(([type]) => type !== 'virtual')
                        .map(([type, name, count]) => (
                          <ItemIcon
                            name={name}
                            alt={`'requests' ${count} ${type}:${name}`}
                          />
                        ))}
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
                        {(settings[known] ?? 0) > 80e3
                          ? 'inf'
                          : settings[known]}
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
