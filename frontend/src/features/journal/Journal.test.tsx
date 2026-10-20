import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockApi, wasRequested } from '../../test/mockApi';
import { renderRoute } from '../../test/render';

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
  planned_budget: '5000.00',
  created_at: '2026-10-18T10:00:00Z',
  countries: ['Italy'],
};

const rome = {
  id: 4,
  trip: 7,
  city: {
    id: 1,
    name: 'Rome',
    country_code: 'IT',
    country_name: 'Italy',
    latitude: '41.902800',
    longitude: '12.496400',
  },
  visited_on: '2026-05-12',
  position: 0,
};

const arrival = {
  id: 1,
  trip: 7,
  date: '2026-05-12',
  place: 4,
  place_name: 'Rome',
  title: 'Arrival in Rome',
  body: 'We landed at **noon**.\n\n- Trastevere\n- Gelato',
};

const evening = {
  id: 2,
  trip: 7,
  date: '2026-05-12',
  place: null,
  place_name: null,
  title: 'Evening walk',
  body: 'Along the Tiber.',
};

const vatican = {
  id: 3,
  trip: 7,
  date: '2026-05-13',
  place: 4,
  place_name: 'Rome',
  title: 'The Vatican before the crowds',
  body: '## Early start\n\n<script>alert(1)</script><b>raw</b>',
};

const ENTRIES = 'GET /journal-entries/?trip=7';

function body(init: RequestInit): unknown {
  return JSON.parse(init.body as string);
}

test('entries are grouped by day with their Markdown formatted', async () => {
  mockApi({
    'GET /auth/me/': visitor,
    'GET /trips/7/': trip,
    [ENTRIES]: [arrival, evening, vatican],
  });

  renderRoute('/trips/7/journal');

  const firstDay = (await screen.findByRole('heading', { name: 'Tuesday, 12 May 2026' }))
    .parentElement as HTMLElement;
  // A day can have several entries (US-07).
  expect(within(firstDay).getByRole('heading', { name: 'Arrival in Rome' })).toBeInTheDocument();
  expect(within(firstDay).getByRole('heading', { name: 'Evening walk' })).toBeInTheDocument();
  expect(within(firstDay).getByText('noon').tagName).toBe('STRONG');
  expect(
    within(firstDay)
      .getAllByRole('listitem')
      .map((item) => item.textContent),
  ).toEqual(['Trastevere', 'Gelato']);
  expect(within(firstDay).getByText('📍 Rome')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Wednesday, 13 May 2026' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Early start' })).toBeInTheDocument();
});

test('raw HTML in an entry is not rendered', async () => {
  mockApi({ 'GET /auth/me/': visitor, 'GET /trips/7/': trip, [ENTRIES]: [vatican] });

  const { container } = renderRoute('/trips/7/journal');

  await screen.findByRole('heading', { name: 'Early start' });
  expect(container.querySelector('script')).toBeNull();
  expect(container.querySelector('b')).toBeNull();
});

test('visitors read the journal without edit controls', async () => {
  mockApi({ 'GET /auth/me/': visitor, 'GET /trips/7/': trip, [ENTRIES]: [arrival] });

  renderRoute('/trips/7/journal');

  await screen.findByRole('heading', { name: 'Arrival in Rome' });
  expect(screen.queryByRole('button', { name: '+ New entry' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
});

test('a trip without entries says so', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/7/': trip, [ENTRIES]: [] });

  renderRoute('/trips/7/journal');

  expect(await screen.findByText('No journal entries yet.')).toBeInTheDocument();
});

test('the author writes an entry with a live preview', async () => {
  let sent: unknown;
  const fetchMock = mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [ENTRIES]: [],
    'GET /places/?trip=7': [rome],
    'POST /journal-entries/': (init) => {
      sent = body(init);
      return Response.json(arrival, { status: 201 });
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/journal');

  await user.click(await screen.findByRole('button', { name: '+ New entry' }));
  const modal = await screen.findByRole('dialog', { name: 'New journal entry' });
  await user.click(within(modal).getByRole('button', { name: /Date/ }));
  await user.click(screen.getByRole('button', { name: '12 May 2026' }));
  await user.click(within(modal).getByRole('combobox', { name: /Place/ }));
  await user.click(screen.getByRole('option', { name: 'Rome, 12 May 2026' }));
  await user.type(within(modal).getByLabelText(/Title/), 'Arrival in Rome');
  await user.type(within(modal).getByLabelText(/Markdown/), 'We landed at **noon**.');

  const preview = within(modal).getByLabelText('Preview');
  expect(within(preview).getByRole('heading', { name: 'Arrival in Rome' })).toBeInTheDocument();
  expect(within(preview).getByText('noon').tagName).toBe('STRONG');

  await user.click(within(modal).getByRole('button', { name: 'Save entry' }));

  expect(await screen.findByText('Entry saved.')).toBeInTheDocument();
  expect(sent).toEqual({
    date: '2026-05-12',
    place: 4,
    title: 'Arrival in Rome',
    body: 'We landed at **noon**.',
    trip: 7,
  });
  expect(wasRequested(fetchMock, 'POST', '/journal-entries/')).toBe(true);
});

test('a date outside the trip shows the API error', async () => {
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [ENTRIES]: [arrival],
    'GET /places/?trip=7': [rome],
    'PATCH /journal-entries/1/': Response.json(
      { date: ['The date must be within the trip, 12 May 2026 to 20 May 2026.'] },
      { status: 400 },
    ),
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/journal');

  await user.click(await screen.findByRole('button', { name: 'Edit Arrival in Rome' }));
  const modal = await screen.findByRole('dialog', { name: 'Edit journal entry' });
  expect(within(modal).getByLabelText(/Title/)).toHaveValue('Arrival in Rome');
  await user.click(within(modal).getByRole('button', { name: 'Save entry' }));

  expect(
    await within(modal).findByText('The date must be within the trip, 12 May 2026 to 20 May 2026.'),
  ).toBeInTheDocument();
});

test('the author deletes an entry after a warning about its photos', async () => {
  const fetchMock = mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [ENTRIES]: [arrival],
    'GET /places/?trip=7': [rome],
    'DELETE /journal-entries/1/': new Response(null, { status: 204 }),
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/journal');

  await user.click(await screen.findByRole('button', { name: 'Edit Arrival in Rome' }));
  const modal = await screen.findByRole('dialog', { name: 'Edit journal entry' });
  await user.click(within(modal).getByRole('button', { name: 'Delete entry' }));
  expect(within(modal).getByText(/Its attached photos will be deleted too\./)).toBeInTheDocument();
  await user.click(within(modal).getByRole('button', { name: 'Delete' }));

  expect(await screen.findByText('Entry deleted.')).toBeInTheDocument();
  expect(wasRequested(fetchMock, 'DELETE', '/journal-entries/1/')).toBe(true);
});

function photo(id: number, caption: string, journalEntry: number | null) {
  return {
    id,
    trip: 7,
    journal_entry: journalEntry,
    image: `/media/photos/${id}.jpg`,
    thumbnail: `/media/photos/thumbnails/${id}.jpg`,
    caption,
    created_at: '2026-10-20T10:00:00Z',
  };
}

test('each entry shows its attached photos, which open in the viewer', async () => {
  mockApi({
    'GET /auth/me/': visitor,
    'GET /trips/7/': trip,
    [ENTRIES]: [arrival, evening],
    'GET /photos/?trip=7': [
      photo(1, 'Landing', 1),
      photo(2, 'Gallery only', null),
      photo(3, 'Tiber at night', 2),
      photo(4, 'Gelato', 1),
    ],
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/journal');

  const first = (await screen.findByRole('heading', { name: 'Arrival in Rome' })).closest(
    'article',
  ) as HTMLElement;
  await within(first).findByRole('img', { name: 'Landing' });
  expect(
    within(first)
      .getAllByRole('img')
      .map((image) => image.getAttribute('alt')),
  ).toEqual(['Landing', 'Gelato']);
  const second = screen
    .getByRole('heading', { name: 'Evening walk' })
    .closest('article') as HTMLElement;
  expect(
    within(second)
      .getAllByRole('img')
      .map((image) => image.getAttribute('alt')),
  ).toEqual(['Tiber at night']);
  expect(screen.queryByRole('img', { name: 'Gallery only' })).not.toBeInTheDocument();

  // The viewer moves between the entry's own photos.
  await user.click(within(first).getByRole('button', { name: 'Open Landing' }));
  expect(await screen.findByRole('dialog', { name: 'Landing · 1 / 2' })).toBeInTheDocument();
});
