import { Component, ComponentChild } from 'preact';
import { data } from './index';
import { Stop } from '../scripts/load-recs';
import { Item } from './objects';

function smatch(name: string, props: { search?: string }) {
  // TODO: proper string comparison
  if (!props.search) return true;
  return name.toLowerCase().includes(props.search.toLowerCase());
}

export class StationList extends Component<
  { limit?: number },
  { search?: string }
> {
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

  render(
    state: { limit?: number },
    props: { search?: string },
  ): ComponentChild {
    const found = Object.entries(this.stations)
      .filter(([name]) => {
        if (!props.search) return true;
        // TODO: proper string comparison
        // TODO: search other attributes
        return smatch(name, props);
      })
      .sort(([a], [b]) => compareWithoutIcons(a, b));
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
          {found.slice(0, state.limit ?? Infinity).map(([name, stops]) => (
            <li>
              <RenderIcons text={name} />{' '}
              {stops.length !== 1 ? `(${stops.length} stops)` : ''}
              {stops.map(({ blockNo }) => (
                <a style="padding: 0 4px" href={`/block/${blockNo}`}>
                  {blockNo}
                </a>
              ))}
            </li>
          ))}
          {found.length >= (state.limit ?? Infinity) ? <li>...</li> : <></>}
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

export function cleanupName(name: string) {
  const stripIcons = /\[[a-z0-9-]+=[a-z0-9-]+]/g;
  const normaliseSpace = /\/|\s+/g;
  return name.replace(stripIcons, ' ').replace(normaliseSpace, ' ').trim();
}

export function compareWithoutIcons(a: string, b: string) {
  return cleanupName(a).localeCompare(cleanupName(b), 'en', {
    sensitivity: 'base',
  });
}

export class ItemList extends Component<
  { limit?: number },
  { search?: string }
> {
  itemMeta: Record<string, { factories: number }> = {};

  constructor() {
    super();
    for (const block of Object.values(data.doc)) {
      for (const [label, count] of Object.entries(block.asm)) {
        const [, recipe] = label.split('\0');
        for (const product of data.recipes[recipe]?.products ?? []) {
          if (product.type !== 'item') {
            continue;
          }
          if (!this.itemMeta[product.name])
            this.itemMeta[product.name] = { factories: 0 };
          this.itemMeta[product.name].factories += count;
        }
      }
    }
  }

  onInput = (e: any) => {
    const search = e.target.value;
    this.setState({ search });
  };

  render(
    state: { limit?: number },
    props: { search?: string },
  ): ComponentChild {
    const found = Object.entries(data.items)
      .filter(([name, item]) => {
        // TODO: search other attributes?
        return smatch(name, props) || smatch(item.localised_name, props);
      })
      .sort(([, { localised_name: a }], [, { localised_name: b }]) =>
        compareWithoutIcons(a, b),
      );
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
        <table>
          {found.slice(0, state.limit ?? Infinity).map(([name, item]) => (
            <tr class="item-list">
              <td title="being made in x factories">
                {this.itemMeta[name]?.factories}
              </td>
              <td>
                <ItemIcon name={name} alt={name} />
              </td>
              <td>
                <Item name={name} />
              </td>
            </tr>
          ))}
          {found.length >= (state.limit ?? Infinity) ? <li>...</li> : <></>}
        </table>
      </div>
    );
  }
}
