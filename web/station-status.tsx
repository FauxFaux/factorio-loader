import { Component } from 'preact';
import { data } from './index';
import { Stop } from '../scripts/load-recs';
import { cleanupName, RenderIcons } from './lists';
import { singularize } from 'inflection';

function strIEq(a: string, b: string): boolean {
  return (
    0 ===
    a.localeCompare(b, 'en', {
      sensitivity: 'base',
      usage: 'search',
    })
  );
}

export function closelyMatchesItemName(label: string): string | null {
  switch (label.toLowerCase()) {
    case 'auog bonemeal':
      return 'bonemeal';
  }
  for (const [name, item] of Object.entries(data.items)) {
    if (strIEq(label, item.localised_name) || strIEq(singularize(label), item.localised_name)) {
      return name;
    }
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
  name = cleanupName(name);
  let ma = name.match(/^([a-z0-9 ]+) Provide/i);
  if (ma) {
    const item = closelyMatchesItemName(ma[1]);
    if (item) {
      matches.add(item);
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

    for (const [loc, stop] of providers) {
      const settings: Settings = Object.fromEntries(
        stop.settings
          .filter(
            ([kind, name]) => kind === 'virtual' && name.startsWith('ltn-'),
          )
          .map(([, name, value]) => [name, value] as const),
      );

      const items = Object.fromEntries(
        stop.items
          .filter(([kind]) => kind === 'item')
          .map(([, name, value]) => [name, value] as const),
      );
    }

    return (
      <>
        <div className="row">
          <h2>Provider-like things</h2>
          <ul>
            {providers.map((stop) => (
              <li>
                <StopLine stop={stop} />
                <p>{[...provideStationPurpose(stop[1].name)]}</p>
                <ul>
                  {stop[1].items.map((line) => (
                    <li>{JSON.stringify(line)}</li>
                  ))}
                </ul>
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
    return (
      <span>
        <RenderIcons text={props.stop[1].name} /> ({props.stop[0]})
      </span>
    );
  }
}
