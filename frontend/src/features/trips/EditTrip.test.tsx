import { screen } from '@testing-library/react';
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
  summary: 'Pasta and lemons.',
  cover_photo: '/media/covers/rome.jpg',
  status: 'draft',
  planned_budget: null,
  created_at: '2026-10-18T10:00:00Z',
};

function fileInput(): HTMLInputElement {
  // The dropzone keeps its file input hidden, so the test reaches it directly.
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('the cover photo dropzone has no file input');
  }
  return input;
}

test('the author sees Edit and Delete on the trip page', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/7/': trip });

  renderRoute('/trips/7');

  expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute(
    'href',
    '/trips/7/edit',
  );
  expect(screen.getByRole('button', { name: 'Delete trip' })).toBeInTheDocument();
});

test('a visitor sees neither Edit nor Delete', async () => {
  mockApi({ 'GET /auth/me/': visitor, 'GET /trips/7/': { ...trip, status: 'published' } });

  renderRoute('/trips/7');

  expect(await screen.findByRole('heading', { name: trip.title, level: 1 })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete trip' })).not.toBeInTheDocument();
});

test('editing starts from the saved trip and can publish a draft', async () => {
  let sent = new FormData();
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'PATCH /trips/7/': (init) => {
      sent = init.body as FormData;
      return { ...trip, title: 'Rome again', status: 'published' };
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/edit');

  const title = await screen.findByLabelText(/Title/);
  expect(title).toHaveValue(trip.title);
  expect(screen.getByLabelText('Summary')).toHaveValue(trip.summary);
  expect(screen.getByRole('img', { name: 'Current cover photo' })).toHaveAttribute(
    'src',
    trip.cover_photo,
  );
  await user.clear(title);
  await user.type(title, 'Rome again');
  await user.click(screen.getByText('Published'));
  await user.click(screen.getByRole('button', { name: 'Save trip' }));

  expect(await screen.findByRole('heading', { name: 'Rome again', level: 1 })).toBeInTheDocument();
  expect(Object.fromEntries(sent.entries())).toEqual({
    title: 'Rome again',
    start_date: trip.start_date,
    end_date: trip.end_date,
    summary: trip.summary,
    status: 'published',
  });
});

test('a new cover photo replaces the current one', async () => {
  let sent = new FormData();
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'PATCH /trips/7/': (init) => {
      sent = init.body as FormData;
      return trip;
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/edit');

  await screen.findByLabelText(/Title/);
  await user.upload(fileInput(), new File(['jpeg bytes'], 'amalfi.jpg', { type: 'image/jpeg' }));
  expect(screen.getByText('amalfi.jpg selected')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save trip' }));

  await screen.findByRole('link', { name: 'Edit' });
  expect((sent.get('cover_photo') as File).name).toBe('amalfi.jpg');
});

test('a date error from the API appears under the dates', async () => {
  const error = 'A place or journal entry is dated 19 May 2026, after this end date.';
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'PATCH /trips/7/': Response.json({ end_date: [error] }, { status: 400 }),
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/edit');

  await user.click(await screen.findByRole('button', { name: 'Save trip' }));

  expect(await screen.findByText(error)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Edit trip', level: 1 })).toBeInTheDocument();
});

test('a visitor who opens the edit form is sent to sign in', async () => {
  mockApi({ 'GET /auth/me/': visitor, 'GET /trips/7/': trip });

  renderRoute('/trips/7/edit');

  expect(await screen.findByRole('heading', { name: 'Sign in', level: 1 })).toBeInTheDocument();
});

test('deleting asks for confirmation and cancelling keeps the trip', async () => {
  const fetchMock = mockApi({ 'GET /auth/me/': author, 'GET /trips/7/': trip });
  const user = userEvent.setup();
  renderRoute('/trips/7');

  await user.click(await screen.findByRole('button', { name: 'Delete trip' }));

  expect(
    screen.getByText(
      'Delete ‘Rome and the Amalfi Coast’? Its places, journal entries, photos and expenses will be deleted too.',
    ),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(wasRequested(fetchMock, 'DELETE', '/trips/7/')).toBe(false);
});

test('confirming the delete removes the trip and returns to the trip list', async () => {
  const fetchMock = mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'DELETE /trips/7/': new Response(null, { status: 204 }),
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/edit');

  await user.click(await screen.findByRole('button', { name: 'Delete trip' }));
  await user.click(screen.getByRole('button', { name: 'Delete' }));

  expect(await screen.findByRole('heading', { name: 'Trips', level: 1 })).toBeInTheDocument();
  expect(wasRequested(fetchMock, 'DELETE', '/trips/7/')).toBe(true);
  expect(screen.getByText('Trip deleted.')).toBeInTheDocument();
});
