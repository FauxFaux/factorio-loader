import { Component, createRef } from 'preact';
import { render as stringify } from 'preact-render-to-string';
import { useEffect } from 'preact/hooks';
import type Leaflet from 'leaflet';

import { BRICK_H, BRICK_W, fromLoc, toBlock } from '../../scripts/magic';
import { TagList } from '../objects';
import { data } from '../datae';
import { useLib } from '../muffler/libs';

interface MapProps {
  gps?: string;
  zoom?: string;
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
      const [map, tl] = leafletMap(L, transformation, this.map.current);

      map.setView(center, zoom);
      map.on('moveend', () => {
        const c = map.getCenter();
        const z = map.getZoom();
        window.location.hash = `#/map/${c.lng.toFixed()},${c.lat.toFixed()}/${z}`;
        this.setState({ lastMove: Date.now() });
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
                <TagList tags={data.doc[loc]?.tags} />)
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

    const times: Record<number, number> = {};

    let rand = 37;
    for (let i = 0; i < 80; i++) {
      rand = (rand * 1664525 + 1013904223) & 0xffffffff;
      times[i] = Math.round((i + 1) * 9 + ((Math.abs(rand) % 32) / 32) * 6);
    }

    const lastHour = Math.max(...Object.values(times));

    const timeList = Object.entries(times);
    return (
      <>
        <div class="slippy" ref={this.map}></div>
        <div class="slippy--time-range">
          <ol class="slippy--time-range-bar">
            {timeList.map(([i, t], j) => {
              const [, prev] = timeList[j - 1] ?? ['0', 0];
              const p = ((t - prev) / lastHour) * 100;
              const style: Record<string, string> = { width: `${p}%` };
              if (i === state.timeName) {
                style['background-color'] = 'red';
              }
              return (
                <li
                  style={style}
                  title={`${t} hours`}
                  onClick={() => {
                    this.setState({ timeName: i });
                  }}
                >
                  &nbsp;
                </li>
              );
            })}
          </ol>
          <ol class="slippy--time-range-legend">
            {timeList.flatMap(([i, t], j) => {
              if (j % 10 !== 9) return [];
              const [, prev] = timeList[j - 10] ?? ['0', 0];
              const p = ((t - prev) / lastHour) * 100;
              const style = { width: `${p}%` };
              return [
                <li style={style}>
                  {prev}h - {t}h
                </li>,
              ];
            })}
          </ol>
        </div>
      </>
    );
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
