import { Box } from '@mantine/core';
import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';

import { OsmTileLayer } from '../../components/OsmTileLayer';
import type { Place, Point } from './api';
import { routePositions, type RouteView, routeView } from './route';

const WORLD_CENTER: [number, number] = [30, 10];
const WORLD_ZOOM = 2;
const PLACE_ZOOM = 9;
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

/** Frames the route whenever its places change, but not on other renders, so the map keeps
 * still while the author picks a point. */
function FitRoute({ view }: { view: RouteView }) {
  const map = useMap();
  // A string, so the effect runs when the route moves rather than on every new `view` object.
  const viewKey = JSON.stringify(view);

  useEffect(() => {
    const current = JSON.parse(viewKey) as RouteView;
    if (current.kind === 'bounds') {
      map.fitBounds(current.bounds, { padding: [40, 40] });
    } else if (current.kind === 'place') {
      map.setView(current.center, PLACE_ZOOM);
    } else {
      map.setView(WORLD_CENTER, WORLD_ZOOM);
    }
  }, [map, viewKey]);

  return null;
}

/** The trip's route map: numbered pins joined by straight teal lines in the author's order,
 * zoomed to fit (US-06). Circle markers avoid Leaflet's image icons, which bundlers break. */
export function TripMap({ places, pending, onMapClick }: TripMapProps) {
  const positions = routePositions(places);

  return (
    <Box h={480} style={{ borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden' }}>
      <MapContainer
        center={WORLD_CENTER}
        zoom={WORLD_ZOOM}
        style={{ height: '100%', cursor: onMapClick ? 'crosshair' : undefined }}
      >
        <OsmTileLayer />
        <FitRoute view={routeView(positions)} />
        {/* A single place has no line, only its pin. */}
        {positions.length > 1 && (
          <Polyline positions={positions} pathOptions={{ color: TEAL, weight: 3 }} />
        )}
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
