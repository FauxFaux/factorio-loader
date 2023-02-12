import { Component } from 'preact';
import { data } from './index';
import { Stop } from '../scripts/load-recs';
import { cleanupName, ItemIcon, RenderIcons } from './lists';
import { singularize } from 'inflection';
import { Item } from './objects';

function strIEq(a: string, b: string): boolean {
  return (
    0 ===
    a.localeCompare(b, 'en', {
      sensitivity: 'base',
      usage: 'search',
      ignorePunctuation: true,
    })
  );
}

const labelLookupCache: Record<string, string> = {};

export function closelyMatchesItemName(label: string): string | null {
  if (Object.keys(labelLookupCache).length === 0) {
    for (const [name, item] of Object.entries(data.items)) {
      labelLookupCache[item.localised_name.toLowerCase()] = name;
    }
  }

  const quick = labelLookupCache[label.toLowerCase()];
  if (quick) return quick;

  switch (label.toLowerCase()) {
    // typo: inductor
    case 'air-core conductor':
      return 'inductor1';
  }
  for (const [name, item] of Object.entries(data.items)) {
    if (
      strIEq(label, item.localised_name) ||
      strIEq(singularize(label), item.localised_name)
    ) {
      return name;
    }
  }

  return null;
}

function closelyMatches(label: string): string | null {
  let cleaned = cleanupName(label);
  let v = closelyMatchesItemName(cleaned);
  if (v) return v;
  v = closelyMatchesItemName(cleaned + ' barrel');
  if (v) return v;
  if (cleaned.startsWith('Auog ')) {
    v = closelyMatchesItemName(cleaned.slice('Auog '.length));
    if (v) return v;
  }

  return null;
}

export function provideStationPurpose(name: string): Set<string> {
  const matches = new Set<string>();
  for (const ma of name.matchAll(/\[item=([a-z0-9-]+)]/g)) {
    const item = ma[1];
    if (item in data.items) {
      matches.add(item);
    }
  }

  if (matches.size) return matches;
  name = cleanupName(name);
  let ma = name.match(/^([a-zA-Z0-9 /-]+) Provide/i);
  if (ma) {
    for (const part of ma[1].split('/')) {
      const guess = closelyMatches(part);
      if (guess) {
        matches.add(guess);
      }
    }
  }
  return matches;
}

export class StationStatus extends Component {
  render() {
    const stops = Object.entries(data.doc).flatMap(([loc, brick]) =>
      brick.stop.map((stop) => [loc, stop] as const),
    );

    type Stat = [string, Stop];

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
      } else if (/\bProvide\b/i.exec(stop.name)) {
        providers.push([loc, stop]);
      } else if (/\b(?:Request|drop)\b/i.exec(stop.name)) {
        requesters.push([loc, stop]);
      } else {
        bugs.push([loc, stop]);
      }
    }

    type Settings = Record<string, number>;

    const providerObjs: any[] = [];

    for (const [loc, stop] of providers) {
      const declaring = provideStationPurpose(stop.name);

      const settings: Settings = Object.fromEntries(
        stop.settings
          .filter(
            ([kind, name]) => kind === 'virtual' && name.startsWith('ltn-'),
          )
          .map(([, name, value]) => [name, value] as const),
      );

      const available = Object.fromEntries(
        stop.items
          .filter(([kind]) => kind === 'item')
          .map(([, name, value]) => [name, value] as const),
      );

      const health: Record<string, number> = {};

      for (const declared of declaring) {
        const item = data.items[declared];
        const expectedByStack =
          item.stack_size * (settings['ltn-provider-stack-threshold'] ?? 10);
        const expectedByCount = settings['ltn-provider-threshold'] ?? 1;
        const expected = Math.max(expectedByStack, expectedByCount);
        health[declared] = (available[declared] ?? 0) / expected;
      }

      providerObjs.push({ stop: [loc, stop], health, available, settings });
    }

    return (
      <>
        <div className="row">
          <h2>Provider-like things</h2>
          <ul>
            {providerObjs
              .sort(({ health: a }, { health: b }) => {
                console.log(Object.values(a));
                return (
                  Math.min(...Object.values(a)) - Math.min(...Object.values(b))
                );
              })
              .map(({ stop, health, available, settings }) => (
                <li>
                  <StopLine stop={stop} />
                  <table>
                    {Object.entries(health)
                      .sort(([, a], [, b]) => a - b)
                      .map(([item, health]) => (
                        <tr>
                          <td>
                            {(health * 100).toLocaleString('en', {
                              maximumFractionDigits: 0,
                            })}
                            %
                          </td>
                          <td>
                            <ItemIcon name={item} alt={item} />
                          </td>
                          <td>
                            <Item name={item} />
                          </td>
                        </tr>
                      ))}
                  </table>
                  {/*{JSON.stringify(available)}*/}
                  {/*{JSON.stringify(settings)}*/}
                </li>
              ))}
          </ul>
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

class StopLine extends Component<{ stop: [string, Stop] }> {
  render(props: { stop: [string, Stop] }) {
    const stop = props.stop[1];
    const loc = props.stop[0];
    return (
      <span>
        <RenderIcons text={stop.name} /> (<a href={`/block/${loc}`}>{loc}</a>)
      </span>
    );
  }
}
