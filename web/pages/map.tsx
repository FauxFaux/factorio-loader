import { Component, createRef } from 'preact';
import { render as stringify } from 'preact-render-to-string';
import { useEffect } from 'preact/hooks';
import L from 'leaflet';

import { toBlock } from '../../scripts/magic';
import { TagList } from '../objects';
import { data } from '../datae';

interface MapProps {
  gps?: string;
  zoom?: string;
}

export class Map extends Component<MapProps> {
  map = createRef();

  render(props: MapProps) {
    // tl;dr leaflet uses 0,0 as the top left corner, factorio uses 0,0 as the centre, and then there's a scale factor

    // this is the relation between the screenshot scale (in screenshots.lua) and the leaflet coord system
    const scale = 32;
    // 8.5 is the `-8` in screenshots.lua, and I knew what 512 was at some point
    const off = 8.5 * (512 / scale);
    const transformation = new L.Transformation(1 / scale, off, 1 / scale, off);

    let center = [0, 0];
    let zoom = 6;

    if (props.gps) {
      const [x, y] = props.gps.split(',').map(parseFloat);
      center = [y, x];
    }

    if (props.zoom) {
      zoom = parseInt(props.zoom);
    }

    const crs = L.extend({}, L.CRS.Simple, {
      transformation,
    });
    useEffect(() => {
      const map = L.map(this.map.current, { crs }).setView(center, zoom);
      L.tileLayer('../map-tiles/{z}/{x}/{y}.avif', {
        // 4, 8 are from map-tiles' first level directory; 11 is like my opinion man
        minZoom: 4,
        maxNativeZoom: 8,
        maxZoom: 11,
      }).addTo(map);

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
