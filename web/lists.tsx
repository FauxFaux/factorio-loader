import { Component, ComponentChild } from 'preact';
import { data } from './index';
import { Stop } from '../scripts/load-recs';
import { Item } from './objects';

function smatch(name: string, props: { search?: string }) {
  // TODO: proper string comparison
  if (!props.search) return true;
  return name.toLowerCase().includes(props.search.toLowerCase());
}

export class StationList extends Component<{}, { search?: string }> {
  stations: Record<string, { blockNo: string; stop: Stop }[]> = {};

  constructor() {
    super();
    for (const [blockNo, { stop: stops }] of Object.entries(data.doc)) {
      for (const stop of stops) {
        if (!this.stations[stop.name]) this.stations[stop.name] = [];
        this.stations[stop.name].push({ blockNo, stop });
      }
    }
  }

  onInput = (e: any) => {
    const search = e.target.value;
    this.setState({ search });
  };

  render(state: {}, props: { search?: string }): ComponentChild {
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
              return smatch(name, props);
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

export class ItemIcon extends Component<{ name: string; alt: string }> {
  render(props: { name: string; alt: string }): ComponentChild {
    return (
      <span
        className="icon-sprite"
        title={props.alt}
        style={`background: url("../data/icons.png") ${data.icons[props.name]}`}
      />
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
          <ItemIcon
            name={name}
            alt={`${type} ${name} (${
              (data as any)[`${type}s`]?.[name]?.localised_name
            })`}
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
  const stripIcons = /\[[a-z0-9-]+=[a-z0-9-]+]/g;
  const normaliseSpace = /\/|\s+/g;
  const ap = a.replace(stripIcons, ' ').replace(normaliseSpace, ' ');
  const bp = b.replace(stripIcons, ' ').replace(normaliseSpace, ' ');
  return ap.trim().localeCompare(bp.trim(), 'en', { sensitivity: 'base' });
}

export class ItemList extends Component {
  onInput = (e: any) => {
    const search = e.target.value;
    this.setState({ search });
  };

  render(state: {}, props: { search?: string }): ComponentChild {
    return (
      <div>
        <p>
          <input
            type="text"
            onInput={this.onInput}
            class="form-control"
            placeholder="Search items (i.e. not fluids) ..."
          ></input>
        </p>
        <ul>
          {Object.entries(data.items)
            .filter(([name, item]) => {
              // TODO: search other attributes?
              return smatch(name, props) || smatch(item.localised_name, props);
            })
            .sort(([, { localised_name: a }], [, { localised_name: b }]) =>
              compareWithoutIcons(a, b),
            )
            .map(([name, item]) => (
              <li>
                <ItemIcon name={name} alt={name} /> <Item name={name} />
              </li>
            ))}
        </ul>
      </div>
    );
  }
}
