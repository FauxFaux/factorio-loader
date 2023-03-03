import { Component, createRef } from 'preact';
import L from 'leaflet';
import { useEffect } from 'preact/hooks';
import 'leaflet/dist/leaflet.css';

export class Map extends Component<{}> {
  map = createRef();

  render() {
    const scale = 32;
    const off = 8.5 * (512 / scale);
    const transformation = new L.Transformation(1 / scale, off, 1 / scale, off);
    const crs = L.extend({}, L.CRS.Simple, {
      transformation,
    });
    useEffect(() => {
      const map = L.map(this.map.current, { crs }).setView([0, 0], 6);
      L.tileLayer('../map-tiles/{z}/{x}/{y}.avif', {
        minZoom: 4,
        maxNativeZoom: 8,
        maxZoom: 11,
      }).addTo(map);
      return () => map.remove();
    }, []);

    return <div class="slippy" ref={this.map}></div>;
  }
}
