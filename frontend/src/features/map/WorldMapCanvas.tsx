import type { FeatureCollection, Geometry } from 'geojson';
import { CircleMarker, GeoJSON, MapContainer, Popup } from 'react-leaflet';

import { OsmTileLayer } from '../../components/OsmTileLayer';

import type { MapCity } from './api';
import { CityVisits } from './CityVisits';
// Natural Earth 1:110m countries (public domain), trimmed to the ISO code and rounded
// coordinates to keep the bundle small.
import countryShapes from './countries.geo.json';

type CountryShapes = FeatureCollection<Geometry, { code: string }>;

const shapes = countryShapes as unknown as CountryShapes;

const TEAL = 'var(--mantine-color-teal-6)';
const ORANGE = 'var(--mantine-color-orange-6)';

interface WorldMapCanvasProps {
  countries: string[];
  cities: MapCity[];
}

/** The Leaflet part of the world map: visited countries filled teal and one orange pin per city
 * (US-05, BR-12). Kept apart so tests can replace it, since Leaflet cannot draw in jsdom. */
export function WorldMapCanvas({ countries, cities }: WorldMapCanvasProps) {
  const visited: CountryShapes = {
    type: 'FeatureCollection',
    features: shapes.features.filter((feature) => countries.includes(feature.properties.code)),
  };

  return (
    <MapContainer center={[30, 10]} zoom={2} minZoom={2} worldCopyJump style={{ height: '100%' }}>
      <OsmTileLayer />
      {/* GeoJSON does not redraw when its data changes, so the key forces a new layer. */}
      <GeoJSON
        key={countries.join(',')}
        data={visited}
        style={{ color: TEAL, weight: 1, fillColor: TEAL, fillOpacity: 0.35 }}
      />
      {cities.map((city) => (
        <CircleMarker
          key={city.id}
          center={[Number(city.latitude), Number(city.longitude)]}
          radius={7}
          pathOptions={{ color: 'white', weight: 2, fillColor: ORANGE, fillOpacity: 1 }}
        >
          <Popup>
            <CityVisits city={city} />
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
