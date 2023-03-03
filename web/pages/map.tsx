import { Component, createRef } from 'preact';
import L from 'leaflet';
import { useEffect } from 'preact/hooks';
import 'leaflet/dist/leaflet.css';

export class Map extends Component<{}> {
  map = createRef();

  render() {
    // tl;dr leaflet uses 0,0 as the top left corner, factorio uses 0,0 as the centre, and then there's a scale factor

    // this is the relation between the screenshot scale (in screenshots.lua) and the leaflet coord system
    const scale = 32;
    // 8.5 is the `-8` in screenshots.lua, and I knew what 512 was at some point
    const off = 8.5 * (512 / scale);
    const transformation = new L.Transformation(1 / scale, off, 1 / scale, off);
    const crs = L.extend({}, L.CRS.Simple, {
      transformation,
    });
    useEffect(() => {
      const map = L.map(this.map.current, { crs }).setView([0, 0], 6);
      L.tileLayer('../map-tiles/{z}/{x}/{y}.avif', {
        // 4, 8 are from map-tiles' first level directory; 11 is like my opinion man
        minZoom: 4,
        maxNativeZoom: 8,
        maxZoom: 11,
      }).addTo(map);
      return () => map.remove();
    }, []);

    return <div class="slippy" ref={this.map}></div>;
  }
}
