import { Component, createRef } from 'preact';
import { render as stringify } from 'preact-render-to-string';
import { useEffect } from 'preact/hooks';
import L, { Transformation } from 'leaflet';

import { BRICK_H, BRICK_W, fromLoc, toBlock } from '../../scripts/magic';
import { TagList } from '../objects';
import { data } from '../datae';

interface MapProps {
  gps?: string;
  zoom?: string;
}

export function leafletTransform() {
  // tl;dr leaflet uses 0,0 as the top left corner, factorio uses 0,0 as the centre, and then there's a scale factor

  // this is the relation between the screenshot scale (in screenshots.lua) and the leaflet coord system
  const scale = 32;
  // 8.5 is the `-8` in screenshots.lua, and I knew what 512 was at some point
  const off = 8.5 * (512 / scale);
  return new L.Transformation(1 / scale, off, 1 / scale, off);
}

function leafletMap(transformation: Transformation, el: HTMLElement) {
  const crs = L.extend({}, L.CRS.Simple, {
    transformation,
  });
  const map = L.map(el, { crs });
  L.tileLayer('../map-tiles/{z}/{x}/{y}.avif', {
    // 4, 8 are from map-tiles' first level directory; 11 is like my opinion man
    minZoom: 4,
    maxNativeZoom: 8,
    maxZoom: 11,
  }).addTo(map);
  return map;
}

export class Map extends Component<MapProps> {
  map = createRef();

  render(props: MapProps) {
    const transformation = leafletTransform();

    let center: [number, number] = [0, 0];
    let zoom = 6;

    if (props.gps) {
      const [x, y] = props.gps.split(',').map(parseFloat);
      center = [y, x];
    }

    if (props.zoom) {
      zoom = parseInt(props.zoom);
    }

    useEffect(() => {
      const map = leafletMap(transformation, this.map.current);

      map.setView(center, zoom);

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

      return () => map.remove();
    }, []);

    return <div class="slippy" ref={this.map}></div>;
  }
}

export class BlockThumb extends Component<{ loc: string }> {
  map = createRef();

  render(props: { loc: string }) {
    const transformation = leafletTransform();
    const [bx, by] = fromLoc(props);

    useEffect(() => {
      const map = leafletMap(transformation, this.map.current);
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
