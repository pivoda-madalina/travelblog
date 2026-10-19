import 'leaflet/dist/leaflet.css';

import { Box } from '@mantine/core';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';

import type { Place, Point } from './api';

const WORLD_CENTER: [number, number] = [30, 10];
const TEAL = 'var(--mantine-color-teal-7)';

interface TripMapProps {
  places: Place[];
  /** The clicked point while the add-place modal is open. */
  pending: Point | null;
  /** Set for the author only; visitors get a map that ignores clicks. */
  onMapClick?: (point: Point) => void;
}

function ClickHandler({ onMapClick }: { onMapClick: (point: Point) => void }) {
  useMapEvents({ click: (event) => onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

/** The trip's map with a numbered pin per place. Route lines and zooming to fit arrive with
 * US-06; circle markers avoid Leaflet's image icons, which bundlers break. */
export function TripMap({ places, pending, onMapClick }: TripMapProps) {
  const last = places.at(-1);
  const center: [number, number] = last
    ? [Number(last.city.latitude), Number(last.city.longitude)]
    : WORLD_CENTER;

  return (
    <Box h={480} style={{ borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={last ? 6 : 2}
        style={{ height: '100%', cursor: onMapClick ? 'crosshair' : undefined }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {places.map((place, index) => (
          <CircleMarker
            key={place.id}
            center={[Number(place.city.latitude), Number(place.city.longitude)]}
            radius={9}
            pathOptions={{ color: TEAL, fillColor: TEAL, fillOpacity: 0.9 }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {index + 1} {place.city.name}
            </Tooltip>
          </CircleMarker>
        ))}
        {pending && (
          <CircleMarker
            center={[pending.lat, pending.lng]}
            radius={9}
            pathOptions={{ color: TEAL, dashArray: '4', fillOpacity: 0.2 }}
          />
        )}
        {onMapClick && <ClickHandler onMapClick={onMapClick} />}
      </MapContainer>
    </Box>
  );
}
