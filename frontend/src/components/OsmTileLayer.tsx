import 'leaflet/dist/leaflet.css';

import { TileLayer } from 'react-leaflet';

/** OpenStreetMap tiles with the attribution their licence requires, shared by every map. */
export function OsmTileLayer() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  );
}
