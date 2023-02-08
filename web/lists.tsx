import { Component, ComponentChild } from 'preact';
import { data } from './index';
import { Stop } from '../scripts/load-recs';

export class StationList extends Component<{}, { search?: string }> {
  stations: Record<string, { blockNo: string; stop: Stop }[]> = {};

  onInput = (e: any) => {
    const search = e.target.value;
    this.setState({ search });
  };

  render(state: {}, props: { search?: string }): ComponentChild {
    if (Object.keys(this.stations).length === 0) {
      for (const [blockNo, { stop: stops }] of Object.entries(data.doc)) {
        for (const stop of stops) {
          if (!this.stations[stop.name]) this.stations[stop.name] = [];
          this.stations[stop.name].push({ blockNo, stop });
        }
      }
    }
    return (
      <div>
        <p>
          <input
            type="text"
            onInput={this.onInput}
            class="form-control"
            placeholder="Search station names..."
          ></input>
        </p>
        <ul>
          {Object.entries(this.stations)
            .filter(([name]) => {
              if (!props.search) return true;
              // TODO: proper string comparison
              // TODO: search other attributes
              return name.toLowerCase().includes(props.search.toLowerCase());
            })
            .sort(([a], [b]) => compareWithoutIcons(a, b))
            .map(([name, stops]) => (
              <li>
                <RenderIcons text={name} />{' '}
                {stops.length !== 1 ? `(${stops.length} stops)` : ''}
              </li>
            ))}
        </ul>
      </div>
    );
  }
}

export class RenderIcons extends Component<{ text: string }> {
  render(props: { text: string }): ComponentChild {
    const text = props.text;
    if (!text.includes('[')) return text;
    const parts: ComponentChild[] = [];
    let prev = 0;
    for (const ma of text.matchAll(/\[([a-z0-9-]+)=([a-z0-9-]+)]/g)) {
      parts.push(' ' + text.slice(prev, ma.index) + ' ');
      prev = ma.index! + ma[0].length;
      const type = ma[1];
      const name = ma[2];
      if (data.icons[name]) {
        parts.push(
          <span
            class="icon-sprite"
            title={`${type} ${name} (${
              (data as any)[`${type}s`]?.[name]?.localised_name
            })`}
            style={`background: url("../data/icons.png") ${data.icons[name]}`}
          />,
        );
      } else {
        parts.push(
          <i>
            [{type}={name}]
          </i>,
        );
      }
    }
    parts.push(text.slice(prev));
    return <>{parts}</>;
  }
}

function compareWithoutIcons(a: string, b: string) {
  const stripIcons = /\[[a-z0-9-]+=[a-z0-9-]+]/;
  const normaliseSpace = /\s+/;
  const ap = a.replace(stripIcons, ' ').replace(normaliseSpace, ' ');
  const bp = b.replace(stripIcons, ' ').replace(normaliseSpace, ' ');
  return ap.trim().localeCompare(bp.trim(), 'en', { sensitivity: 'base' });
}

export class ItemList extends Component {
  render(): ComponentChild {
    return <span>hello</span>;
  }
}
