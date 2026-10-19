import type { LatLngTuple } from 'leaflet';

import type { Place } from './api';

/** The places' coordinates in route order, as the API sends them (US-06). */
export function routePositions(places: Place[]): LatLngTuple[] {
  return places.map((place) => [Number(place.city.latitude), Number(place.city.longitude)]);
}

/** How the map frames the route: the world with no places, one place up close, or the bounds of
 * every place (US-06). */
export type RouteView =
  | { kind: 'world' }
  | { kind: 'place'; center: LatLngTuple }
  | { kind: 'bounds'; bounds: LatLngTuple[] };

export function routeView(positions: LatLngTuple[]): RouteView {
  const [first] = positions;
  if (!first) {
    return { kind: 'world' };
  }
  // Several stops in the same city have one point, so they frame like a single place.
  const distinct = new Set(positions.map(([lat, lng]) => `${lat},${lng}`));
  if (distinct.size === 1) {
    return { kind: 'place', center: first };
  }
  return { kind: 'bounds', bounds: positions };
}
