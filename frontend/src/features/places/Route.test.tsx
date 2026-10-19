import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockApi, wasRequested } from '../../test/mockApi';
import { renderRoute } from '../../test/render';
import type { Place, Point } from './api';

// Leaflet cannot draw in jsdom, so the map is replaced by a button that clicks a known point.
vi.mock('./TripMap', () => ({
  TripMap: ({ places, onMapClick }: { places: Place[]; onMapClick?: (point: Point) => void }) => (
    <div>
      <p>{places.length} pins on the map</p>
      {onMapClick && (
        <button type="button" onClick={() => onMapClick({ lat: 40.62812345, lng: 14.4849 })}>
          Click the map
        </button>
      )}
    </div>
  ),
}));

const author = { is_author: true, username: 'madalina' };
const visitor = { is_author: false, username: null };

const trip = {
  id: 7,
  title: 'Rome and the Amalfi Coast',
  start_date: '2026-05-12',
  end_date: '2026-05-20',
  summary: '',
  cover_photo: null,
  status: 'published',
  planned_budget: null,
  created_at: '2026-10-18T10:00:00Z',
  countries: ['Italy'],
};

function place(id: number, name: string, visited_on: string, position: number) {
  return {
    id,
    trip: 7,
    visited_on,
    position,
    city: {
      id,
      name,
      country_code: 'IT',
      country_name: 'Italy',
      latitude: '41.902800',
      longitude: '12.496400',
    },
  };
}

const rome = place(1, 'Rome', '2026-05-12', 0);
const naples = place(2, 'Naples', '2026-05-15', 1);

const GEOCODE = 'GET /geocode/reverse/?lat=40.628123&lng=14.484900';

function body(init: RequestInit): unknown {
  return JSON.parse(init.body as string);
}

test('a visitor sees the route without edit controls', async () => {
  mockApi({
    'GET /auth/me/': visitor,
    'GET /trips/7/': trip,
    'GET /places/?trip=7': [rome, naples],
  });

  renderRoute('/trips/7');

  expect(await screen.findByText('1 Rome, Italy')).toBeInTheDocument();
  expect(screen.getByText('2 Naples, Italy')).toBeInTheDocument();
  expect(screen.getByText('15 May 2026')).toBeInTheDocument();
  expect(screen.getByText('2 pins on the map')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Click the map' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Move|Delete Rome/ })).not.toBeInTheDocument();
  expect(screen.queryByText('Click the map to add a place.')).not.toBeInTheDocument();
});

test('a trip without places says so, with the hint for the author', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/7/': trip, 'GET /places/?trip=7': [] });

  renderRoute('/trips/7');

  expect(await screen.findByText('No places yet.')).toBeInTheDocument();
  expect(screen.getByText('Click the map to add a place.')).toBeInTheDocument();
});

test('clicking the map fills in the city and country and adds the place', async () => {
  let sent: unknown;
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'GET /places/?trip=7': [rome],
    [GEOCODE]: { name: 'Positano', country_code: 'IT', country_name: 'Italy' },
    'POST /places/': (init) => {
      sent = body(init);
      return Response.json(place(3, 'Positano', '2026-05-17', 1), { status: 201 });
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7');

  await user.click(await screen.findByRole('button', { name: 'Click the map' }));
  const modal = await screen.findByRole('dialog', { name: 'Add place' });
  expect(await within(modal).findByLabelText(/Name/)).toHaveValue('Positano');
  expect(within(modal).getByText('Italy')).toBeInTheDocument();
  await user.click(within(modal).getByRole('button', { name: /Visited/ }));
  await user.click(screen.getByRole('button', { name: '17 May 2026' }));
  await user.click(within(modal).getByRole('button', { name: 'Add place' }));

  expect(await screen.findByText('Place added.')).toBeInTheDocument();
  expect(sent).toEqual({
    trip: 7,
    name: 'Positano',
    country_code: 'IT',
    country_name: 'Italy',
    latitude: '40.628123',
    longitude: '14.484900',
    visited_on: '2026-05-17',
  });
});

test('if the lookup fails, the author types the city and chooses the country', async () => {
  let sent: unknown;
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'GET /places/?trip=7': [],
    [GEOCODE]: Response.json({ detail: 'The lookup service failed.' }, { status: 503 }),
    'POST /places/': (init) => {
      sent = body(init);
      return Response.json(place(3, 'Positano', '2026-05-17', 0), { status: 201 });
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7');

  await user.click(await screen.findByRole('button', { name: 'Click the map' }));
  const modal = await screen.findByRole('dialog', { name: 'Add place' });
  expect(
    await within(modal).findByText(
      'Couldn’t look up this location. Type the city name and country.',
    ),
  ).toBeInTheDocument();
  await user.type(within(modal).getByLabelText(/Name/), 'Positano');
  await user.type(within(modal).getByRole('combobox', { name: /Country/ }), 'Ital');
  await user.click(screen.getByRole('option', { name: 'Italy' }));
  await user.click(within(modal).getByRole('button', { name: /Visited/ }));
  await user.click(screen.getByRole('button', { name: '17 May 2026' }));
  await user.click(within(modal).getByRole('button', { name: 'Add place' }));

  expect(await screen.findByText('Place added.')).toBeInTheDocument();
  expect(sent).toMatchObject({ name: 'Positano', country_code: 'IT', country_name: 'Italy' });
});

test('the date error from the API appears under Visited', async () => {
  const error = 'The visit date must be within the trip, 12 May 2026 to 20 May 2026.';
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'GET /places/?trip=7': [],
    [GEOCODE]: { name: 'Positano', country_code: 'IT', country_name: 'Italy' },
    'POST /places/': Response.json({ visited_on: [error] }, { status: 400 }),
  });
  const user = userEvent.setup();
  renderRoute('/trips/7');

  await user.click(await screen.findByRole('button', { name: 'Click the map' }));
  const modal = await screen.findByRole('dialog', { name: 'Add place' });
  await within(modal).findByDisplayValue('Positano');
  await user.click(within(modal).getByRole('button', { name: /Visited/ }));
  await user.click(screen.getByRole('button', { name: '17 May 2026' }));
  await user.click(within(modal).getByRole('button', { name: 'Add place' }));

  expect(await within(modal).findByText(error)).toBeInTheDocument();
});

test('moving a place sends the new route order in one request', async () => {
  let sent: unknown;
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'GET /places/?trip=7': [rome, naples],
    'POST /places/reorder/': (init) => {
      sent = body(init);
      return [
        { ...naples, position: 0 },
        { ...rome, position: 1 },
      ];
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7');

  expect(await screen.findByRole('button', { name: 'Move Rome up' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Move Rome down' }));

  expect(await screen.findByText('1 Naples, Italy')).toBeInTheDocument();
  expect(sent).toEqual({ trip: 7, places: [2, 1] });
});

test('deleting a place asks for confirmation first', async () => {
  const fetchMock = mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'GET /places/?trip=7': [rome, naples],
    'DELETE /places/1/': new Response(null, { status: 204 }),
  });
  const user = userEvent.setup();
  renderRoute('/trips/7');

  await user.click(await screen.findByRole('button', { name: 'Delete Rome' }));
  const modal = screen.getByRole('dialog', { name: 'Delete place' });
  expect(within(modal).getByText('Delete Rome from the route?')).toBeInTheDocument();
  expect(wasRequested(fetchMock, 'DELETE', '/places/1/')).toBe(false);
  await user.click(within(modal).getByRole('button', { name: 'Delete' }));

  expect(await screen.findByText('Place deleted.')).toBeInTheDocument();
  expect(wasRequested(fetchMock, 'DELETE', '/places/1/')).toBe(true);
});
