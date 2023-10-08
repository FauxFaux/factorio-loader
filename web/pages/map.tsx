import { Component, createRef } from 'preact';
import { render as stringify } from 'preact-render-to-string';
import { useEffect } from 'preact/hooks';
import type Leaflet from 'leaflet';

import { BRICK_H, BRICK_W, fromLoc, toBlock } from '../../scripts/magic';
import { TagList } from '../objects';
import { data, MapRef } from '../datae';
import { useLib } from '../muffler/libs';

interface MapProps {
  gps?: string;
  zoom?: string;
  timeName?: string;
}

export function leafletTransform(L: typeof Leaflet) {
  // tl;dr leaflet uses 0,0 as the top left corner, factorio uses 0,0 as the centre, and then there's a scale factor

  // this is the relation between the screenshot scale (in screenshots.lua) and the leaflet coord system
  const scale = 32;
  // 8.5 is the `-8` in screenshots.lua, and I knew what 512 was at some point
  const off = 16.5 * 8;
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
  const map = L.map(el, { crs });
  const tl = L.tileLayer('../map-tiles/{z}/{x}/{y}.avif?v=9', {
    // 0, 9 are from map-tiles' first level directory; 12 is like my opinion man
    minZoom: 0,
    maxNativeZoom: 9,
    maxZoom: 12,
  });
  tl.addTo(map);
  return [map, tl] as const;
}

interface LeafletState {
  map?: Leaflet.Map;
  tl?: Leaflet.TileLayer;
  timeName?: string;
  lastMove?: number;
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
    let zoom = 6;

    if (props.gps) {
      const [x, y] = props.gps.split(',').map(parseFloat);
      center = [y, x];
    }

    if (props.zoom) {
      zoom = parseInt(props.zoom);
    }

    // honestly have no idea how state and effects interact
    useEffect(() => {
      // some kind of debounce?
      if (Date.now() - (state.lastMove ?? 0) < 1000) return;
      state.map?.setView(center, zoom);
    }, [center, zoom]);

    useEffect(() => {
      state.tl?.setUrl(`../so-${state.timeName}/out/{z}/{x}/{y}.avif`);
    }, [state.timeName]);

    useEffect(() => {
      const [map, tl] = leafletMap(L, transformation, this.map.current);

      map.setView(center, zoom);
      map.on('moveend', () => {
        this.updateUrl();
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

      this.setState({ map, tl });

      return () => {
        this.setState({ map: undefined, tl: undefined });
        map.remove();
      };
    }, []);

    const timeList = data.maps.maps;

    const TPS = 60;
    const hour = (tick: number) => Math.round(tick / TPS / 60 / 60);
    const width = (end: MapRef, start?: MapRef) =>
      (hour(end.tick - (start?.tick ?? 0)) / lastHour) * 100;
    const last = timeList[timeList.length - 1];
    const lastHour = hour(last.tick);
    const picked = state.timeName ?? last.date;

    return (
      <>
        <div class="slippy" ref={this.map}></div>
        <div class="slippy--time-range">
          <ol class="slippy--time-range-bar">
            {timeList.map((ref, i) => {
              const prev: MapRef | undefined = timeList[i - 1];
              const style: Record<string, string> = {
                width: `${width(ref, prev)}%`,
              };
              if (ref.date === picked) {
                // button blue
                style['background-color'] = '#0d6efd';
              }
              return (
                <li
                  style={style}
                  title={`${ref.date} - ${hour(ref.tick)} hours`}
                  onClick={() => {
                    this.setState({ timeName: ref.date });
                    this.updateUrl();
                  }}
                >
                  &nbsp;
                </li>
              );
            })}
          </ol>
          <ol class="slippy--time-range-legend">
            {timeList.flatMap((ref, i) => {
              const gap = 3;
              if (i % gap !== gap - 1) return [];
              const prev: MapRef | undefined = timeList[i - gap];
              const style: Record<string, string> = {
                width: `${width(ref, prev)}%`,
              };
              return [
                <li style={style}>
                  {hour(prev?.tick ?? 0)}h - {hour(ref.tick)}h
                </li>,
              ];
            })}
          </ol>
        </div>
      </>
    );
  }

  private updateUrl() {
    if (!this.state.map) return;
    const c = this.state.map.getCenter();
    const z = this.state.map.getZoom();
    const timeName =
      this.state.timeName ?? data.maps.maps[data.maps.maps.length - 1].date;
    window.location.hash = `#/map/${c.lng.toFixed()},${c.lat.toFixed()}/${z}/${timeName}`;
    this.setState({ lastMove: Date.now() });
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
      const [map] = leafletMap(L, transformation, this.map.current);
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
