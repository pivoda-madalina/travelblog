import { screen, within } from '@testing-library/react';

import { mockApi } from '../../test/mockApi';
import { renderRoute } from '../../test/render';
import type { MapCity } from './api';
import { CityVisits } from './CityVisits';

// Leaflet cannot draw in jsdom, so the canvas is replaced by a list of what it would draw. The
// pin popups use the real CityVisits component.
vi.mock('./WorldMapCanvas', () => ({
  WorldMapCanvas: ({ countries, cities }: { countries: string[]; cities: MapCity[] }) => (
    <div>
      <p>Filled: {countries.join(' ')}</p>
      {cities.map((city) => (
        <section key={city.id} aria-label={`Pin ${city.name}`}>
          <CityVisits city={city} />
        </section>
      ))}
    </div>
  ),
}));

const visitor = { is_author: false, username: null };

function city(id: number, name: string, code: string, country: string, visits: object[]) {
  return {
    id,
    name,
    country_code: code,
    country_name: country,
    latitude: '41.902800',
    longitude: '12.496400',
    visits,
  };
}

const rome = city(1, 'Rome', 'IT', 'Italy', [
  { trip: 7, title: 'Rome and the Amalfi Coast', visited_on: '2026-05-12' },
  { trip: 3, title: 'Weekend in Rome', visited_on: '2025-11-08' },
]);
const lisbon = city(2, 'Lisbon', 'PT', 'Portugal', [
  { trip: 4, title: 'Lisbon long weekend', visited_on: '2026-03-03' },
]);

test('the map fills the visited countries and sums them up', async () => {
  mockApi({
    'GET /auth/me/': visitor,
    'GET /map/': { countries: ['IT', 'PT'], cities: [lisbon, rome] },
  });

  renderRoute('/map');

  expect(await screen.findByText('Filled: IT PT')).toBeInTheDocument();
  expect(screen.getByText('2 countries · 2 cities')).toBeInTheDocument();
});

test('a pin lists every trip that visited the city, with dates and links', async () => {
  mockApi({ 'GET /auth/me/': visitor, 'GET /map/': { countries: ['IT'], cities: [rome] } });

  renderRoute('/map');

  const pin = await screen.findByRole('region', { name: 'Pin Rome' });
  expect(within(pin).getByText('Rome, Italy')).toBeInTheDocument();
  expect(within(pin).getByRole('link', { name: 'Rome and the Amalfi Coast' })).toHaveAttribute(
    'href',
    '/trips/7',
  );
  expect(within(pin).getByText('12 May 2026')).toBeInTheDocument();
  expect(within(pin).getByRole('link', { name: 'Weekend in Rome' })).toHaveAttribute(
    'href',
    '/trips/3',
  );
  expect(within(pin).getByText('8 Nov 2025')).toBeInTheDocument();
  expect(screen.getByText('1 country · 1 city')).toBeInTheDocument();
});

test('an empty map says no places were visited yet', async () => {
  mockApi({ 'GET /auth/me/': visitor, 'GET /map/': { countries: [], cities: [] } });

  renderRoute('/map');

  expect(await screen.findByText('No places visited yet.')).toBeInTheDocument();
  expect(screen.queryByText(/countr/)).not.toBeInTheDocument();
});
