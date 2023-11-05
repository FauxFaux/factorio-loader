import { Component, createRef } from 'preact';
import { render as stringify } from 'preact-render-to-string';
import { useEffect } from 'preact/hooks';
import type Leaflet from 'leaflet';

import { BRICK_H, BRICK_W, fromLoc, toBlock } from '../../scripts/magic';
import { TagList } from '../objects';
import { data, MapRef } from '../datae';
import { useLib } from '../muffler/libs';
import _chunk from 'lodash/chunk';
import { countItem, intersperse } from './block';
import { Colon } from '../muffler/colon';

interface MapProps {
  gps?: string;
  zoom?: string;
  timeName?: string;
}

const tileOpts = {
  // 0, 9 are from map-tiles' first level directory; 12 is like my opinion man
  minZoom: 0,
  maxNativeZoom: 5,
  maxZoom: 9,
  tileSize: 2048,
};

export function leafletTransform(L: typeof Leaflet) {
  // these are determined experimentally because I have a very smooth brain
  const scale = 4;
  const off = 992;
  return new L.Transformation(1 / scale, off, 1 / scale, off);
}

function leafletMap(
  L: typeof Leaflet,
  transformation: Leaflet.Transformation,
  el: HTMLElement,
) {
  const crs = L.extend({}, L.CRS.Simple, {
    transformation,
  });
  return L.map(el, { crs });
}

interface LeafletState {
  map?: Leaflet.Map;
  tl?: Leaflet.TileLayer;
  lastMove?: number;
}

function latestMapDate() {
  return data.maps.maps[data.maps.maps.length - 1].date;
}

function tlUrl(timeName: string) {
  return `../so-${timeName}/out/nih/{z}/{x}/{y}.avif`;
}

export class Map extends Component<MapProps, LeafletState> {
  map = createRef();

  render(props: MapProps, state: LeafletState) {
    const [lErr, L] = useLib('leaflet');
    if (lErr) {
      return <div class="slippy">{lErr}</div>;
    }

    const transformation = leafletTransform(L);

    let center: [number, number] = [0, 0];
    let zoom = 2;

    if (props.gps) {
      const [x, y] = props.gps.split(',').map(parseFloat);
      center = [y, x];
    }

    if (props.zoom) {
      zoom = parseInt(props.zoom);
    }

    if (!props.timeName) {
      const timeName = latestMapDate();
      this.setUrl(center[0], center[1], zoom, timeName, true);
      return (
        <div class="slippy">
          Please enjoy this forced refresh because the author does not
          understand (p)react.
        </div>
      );
    }

    // if (!state.tl) {
    //   const tl = L.tileLayer(tlUrl(props.timeName), tileOpts);
    //   this.setState({ tl });
    // }

    useEffect(() => {
      if (state.tl) this.state.map?.addLayer(state.tl);
    }, [state.tl, state.map]);

    useEffect(() => {
      // const handler = (ev: Key) => {
      //
      // };
      const handler = (ev: KeyboardEvent) => {
        if ('z' !== ev.key && 'x' !== ev.key) return;
        ev.preventDefault();
        const delta = ev.key === 'z' ? -1 : 1;
        const idx = timeList.findIndex(
          (ref) => ref.date === this.props.timeName,
        );
        const next = timeList[idx + delta];
        if (!next) return;
        this.updateUrl(next.date);
      };
      document.addEventListener('keyup', handler);
      return () => document.removeEventListener('keyup', handler);
    }, []);

    useEffect(() => {
      const tl = L.tileLayer(tlUrl(this.props.timeName!), tileOpts);
      this.setState(({ tl: prevTl }) => {
        // remove the old layer after a delay, to avoid flicker
        // it's almost certainly not reasonable to do this in the actual setState handler, but suck it
        if (prevTl) {
          const handler = () => {
            setTimeout(() => {
              prevTl?.remove();
              tl.removeEventListener('load', handler);
            }, 1000);
          };
          tl.addEventListener('load', handler);
        }
        return { tl };
      });
    }, [props.timeName]);

    // honestly have no idea how state and effects interact
    useEffect(() => {
      // some kind of debounce?
      if (Date.now() - (state.lastMove ?? 0) < 1000) return;
      state.map?.setView(center, zoom);
    }, [center, zoom]);

    useEffect(() => {
      const map = leafletMap(L, transformation, this.map.current);

      map.setView(center, zoom);
      map.on('moveend', () => {
        this.updateUrl(this.props.timeName!);
      });

      const popup = L.popup();

      function onMapClick(e: any) {
        const back: any = transformation.transform(e.latlng);
        const gps = [back.lng, back.lat] as [number, number];
        const loc = toBlock(gps).toString();

        popup
          .setLatLng(e.latlng)
          .setContent(
            stringify(
              <>
                [gps={gps[0].toFixed()}, {gps[1].toFixed()}]{' '}
                <a href={`#/block/${loc}`}>{loc}</a> (
                <TagList tags={data.doc[loc]?.tags ?? []} />)
              </>,
            ),
          )
          .openOn(map);
      }

      map.on('click', onMapClick);

      this.setState({ map });

      return () => {
        this.setState({ map: undefined, tl: undefined });
        map.remove();
      };
    }, []);

    const timeList = data.maps.maps;

    const TPS = 60;
    const hour = (tick: number) => Math.round(tick / TPS / 60 / 60);
    const last = timeList[timeList.length - 1];
    const width = (end: MapRef, start?: MapRef) =>
      ((end.tick - (start?.tick ?? 0)) / last.tick) * 100;
    const picked = props.timeName;

    const bar = timeList.map((ref, i) => {
      const prev: MapRef | undefined = timeList[i - 1];
      const w = width(ref, prev);
      if (w < 0.5) return null;
      const style: Record<string, string> = {
        width: `${w}%`,
      };
      if (ref.date === picked) {
        // button blue
        style['background-color'] = '#0d6efd';
      }
      const prog = Math.floor(ref.researchProgress * 100);
      return (
        <li
          style={style}
          title={`${ref.date} - ${hour(ref.tick)} hours, ${prog}% of ${
            ref.researchName
          }`}
          onClick={() => {
            this.updateUrl(ref.date);
          }}
        >
          &nbsp;
        </li>
      );
    });

    const timeChunks = _chunk(timeList, Math.ceil(timeList.length / 7));
    const legend = timeChunks.flatMap((chunks, i) => {
      const prevChunk: MapRef[] | undefined = timeChunks[i - 1];
      const prev: MapRef | undefined = prevChunk?.[prevChunk.length - 1];
      const ref = chunks[chunks.length - 1];
      const w = width(ref, prev);
      const style: Record<string, string> = {
        width: `${w}%`,
      };
      const msg =
        w > 8 ? (
          <>
            {hour(prev?.tick ?? 0)}h - {hour(ref.tick)}h
          </>
        ) : (
          <>- {hour(ref.tick)}h</>
        );
      return [<li style={style}>{msg}</li>];
    });

    const rows = [...timeList].reverse().map((ref) => {
      const chosenOne = ref.date === picked;
      const clazz = chosenOne ? 'slippy--time-range-table--picked' : '';

      const itemList = (items: [Colon, number][]) =>
        intersperse(
          items.sort(([, a], [, b]) => b - a).map(([k, v]) => countItem(k, v)),
          <> </>,
        );

      const scienceList = Object.entries(ref.consumedTotal).filter(([k]) =>
        k.endsWith('-science-pack'),
      );

      const plateList = Object.entries(ref.consumedTotal).filter(([k]) =>
        k.endsWith('-plate'),
      );

      const btn = chosenOne ? (
        <>viewing</>
      ) : (
        <button
          class={'btn btn-primary'}
          onClick={() => this.updateUrl(ref.date)}
        >
          view
        </button>
      );

      return (
        <tr class={clazz}>
          <td>{btn}</td>
          <td>{ref.date}</td>
          <td>{hour(ref.tick)}h</td>
          <td>{itemList(scienceList)}</td>
          <td>{itemList(plateList)}</td>
          <td>
            {Math.floor(ref.researchProgress * 100)}% of{' '}
            {ref.researchName
              ? data.technologies[
                  ref.researchName
                ]?.localised_name?.toLowerCase() ?? ref.researchName
              : 'nothing'}
          </td>
        </tr>
      );
    });

    const table = (
      <table class="table slippy--time-range-table">
        <thead>
          <tr>
            <th></th>
            <th>Date</th>
            <th>
              <abbr title={'played according to the game clock'}>Played</abbr>
            </th>
            <th>Science used</th>
            <th>Plates used</th>
            <th>Research</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
    return (
      <>
        <div class="slippy" ref={this.map}></div>
        <div class="slippy--time-range">
          <ol class="slippy--time-range-bar">{bar}</ol>
          <ol class="slippy--time-range-legend">{legend}</ol>
          <div class={'container-fluid-lg slippy--time-range-help'}>
            <div
              class={'container-fluid slippy--time-range-help--instructions'}
            >
              <div class={'row'}>
                <div className={'col-md-auto'}>
                  <h2>Historical save browser</h2>
                </div>
                <div class={'col'}>
                  Use <kbd>z</kbd> and <kbd>x</kbd> to flip through history
                </div>
                <div className={'col'}>
                  Or, click the quick access bar above
                </div>
              </div>
            </div>
            {table}
          </div>
        </div>
      </>
    );
  }

  private updateUrl(timeName: string) {
    if (!this.state.map) return;
    const c = this.state.map.getCenter();
    const z = this.state.map.getZoom();
    this.setUrl(c.lng, c.lat, z, timeName);
  }

  private setUrl(
    lng: number,
    lat: number,
    zoom: number,
    timeName: string,
    forced?: true,
  ) {
    window.location.hash = `#/map/${lng.toFixed()},${lat.toFixed()}/${zoom}/${timeName}`;
    if (!forced) this.setState({ lastMove: Date.now() });
  }
}

export class BlockThumb extends Component<{ loc: string }, LeafletState> {
  map = createRef();

  render(props: { loc: string }, state: LeafletState) {
    const [lErr, L] = useLib('leaflet');
    if (lErr) return lErr;

    const transformation = leafletTransform(L);
    const [bx, by] = fromLoc(props);

    useEffect(() => {
      const map = leafletMap(L, transformation, this.map.current);
      latestMapDate();
      const pad = 1;
      map.fitBounds(
        [
          [by - pad, bx - pad],
          // brick sizes from magic.ts
          [by + 128 + pad, bx + 192 + pad],
        ],
        { padding: [0, 0] },
      );
      map.dragging.disable();
      map.touchZoom.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.keyboard.disable();
      map.boxZoom.disable();
      map.tap?.disable();
      map.attributionControl.remove();
      map.zoomControl.remove();
      return () => map.remove();
    }, []);

    const mx = bx + BRICK_W / 2;
    const my = by + BRICK_H / 2;
    return (
      <a href={`/map/${mx},${my}/7`}>
        <div class="block-thumb" ref={this.map}></div>
      </a>
    );
  }
}
