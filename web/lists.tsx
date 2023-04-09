import { Component, ComponentChild } from 'preact';
import { data } from './datae';
import { Stop } from '../scripts/load-recs';
import { ItemOrFluid } from './objects';
import { compareWithoutIcons } from './muffler/names';
import { Colon, tupleToColon } from './muffler/colon';

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
        <ul style={'list-style: none; padding-left: 0'}>
          {found.slice(0, state.limit ?? Infinity).map(([name, stops]) => (
            <li>
              <GpsLink caption={name} gps={stops[0].stop.gps} />{' '}
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

interface ItemListProps {
  limit?: number;
  onPick?: (colon: Colon) => void;
}

export class ItemList extends Component<ItemListProps, { search?: string }> {
  itemAsms: Record<Colon, number> = {};

  constructor() {
    super();
    for (const block of Object.values(data.doc)) {
      for (const [label, { count }] of Object.entries(block.asm)) {
        const [, recipe] = label.split('\0');
        for (const product of data.recipes.regular[recipe]?.products ?? []) {
          const colon = product.colon;
          if (!this.itemAsms[colon]) this.itemAsms[colon] = 0;
          this.itemAsms[colon] += count;
        }
      }
    }
  }

  onInput = (e: any) => {
    const search = e.target.value;
    this.setState({ search });
  };

  render(props: ItemListProps, state: { search?: string }): ComponentChild {
    const found = [
      ...Object.entries(data.items).map(([n, i]) => [n, i, 'item'] as const),
      ...Object.entries(data.fluids).map(([n, i]) => [n, i, 'fluid'] as const),
    ]
      .filter(([name, item]) => {
        // TODO: search other attributes?
        return smatch(name, state) || smatch(item.localised_name, state);
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
            placeholder="Search items and fluids..."
          ></input>
        </p>
        <table>
          {found.slice(0, props.limit ?? Infinity).map(([name, , type]) => (
            <tr class="item-list">
              {props.onPick ? (
                <td>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    onClick={() => props.onPick?.(tupleToColon([type, name]))}
                  >
                    +
                  </button>
                </td>
              ) : (
                <></>
              )}
              <td title="being made in x factories">
                {this.itemAsms[tupleToColon([type, name])]}
              </td>
              <td>
                <ItemIcon name={name} alt={name} />
              </td>
              <td>
                <ItemOrFluid type={type} name={name} />
              </td>
            </tr>
          ))}
          {found.length >= (props.limit ?? Infinity) ? (
            <tr>
              <td colSpan={4}>...</td>
            </tr>
          ) : (
            <></>
          )}
        </table>
      </div>
    );
  }
}

export class GpsLink extends Component<
  { caption: string; gps: readonly [number, number] },
  { copied?: boolean }
> {
  doCopy = async () => {
    try {
      const { caption, gps } = this.props;
      await navigator.clipboard.writeText(
        `[gps=${gps[0].toFixed()},${gps[1].toFixed()}] ${caption}`,
      );
      this.setState({ copied: true });
    } catch (err) {
      alert('Failed to copy to clipboard: ' + err);
    }
  };

  onLeave = () => {
    this.setState({ copied: false });
  };
  render(
    props: {
      caption: string;
      gps: readonly [number, number];
    },
    state: { copied?: boolean },
  ): ComponentChild {
    const check = require('svg-url-loader!./check.svg');
    const pin = require('svg-url-loader!./pin.svg');

    if (state.copied) {
      return (
        <span className={'gps-link-button'} onMouseLeave={this.onLeave}>
          <img src={check} alt={'done!'} />
        </span>
      );
    }
    const msg = 'copy location in chat format';
    return (
      <span className={'gps-link-button'} onClick={this.doCopy} title={msg}>
        <img src={pin} alt={msg} />
      </span>
    );
  }
}
