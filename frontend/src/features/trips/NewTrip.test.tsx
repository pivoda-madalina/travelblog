import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';

import { mockApi } from '../../test/mockApi';
import { renderRoute } from '../../test/render';

const author = { is_author: true, username: 'madalina' };
const visitor = { is_author: false, username: null };

// The date picker opens on the current month, so the test picks days from it.
const month = dayjs().startOf('month');
const startDay = month.date(12);
const endDay = month.date(20);

const savedTrip = {
  id: 7,
  title: 'Rome and the Amalfi Coast',
  start_date: startDay.format('YYYY-MM-DD'),
  end_date: endDay.format('YYYY-MM-DD'),
  summary: 'Pasta and lemons.',
  cover_photo: '/media/covers/rome.jpg',
  status: 'draft',
  planned_budget: null,
  created_at: '2026-10-18T10:00:00Z',
  countries: [],
};

function fileInput(): HTMLInputElement {
  // The dropzone keeps its file input hidden, so the test reaches it directly.
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('the cover photo dropzone has no file input');
  }
  return input;
}

async function fillInTrip() {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(/Title/), 'Rome and the Amalfi Coast');
  await user.click(screen.getByRole('button', { name: /Dates/ }));
  await user.click(screen.getByRole('button', { name: startDay.format('D MMMM YYYY') }));
  await user.click(screen.getByRole('button', { name: endDay.format('D MMMM YYYY') }));
  await user.type(screen.getByLabelText('Summary'), 'Pasta and lemons.');
  const cover = new File(['jpeg bytes'], 'rome.jpg', { type: 'image/jpeg' });
  await user.upload(fileInput(), cover);
  return user;
}

test('the author sees New trip in the header', async () => {
  mockApi({ 'GET /auth/me/': author });

  renderRoute('/');

  expect(await screen.findByRole('link', { name: 'New trip' })).toHaveAttribute(
    'href',
    '/trips/new',
  );
});

test('a visitor who opens the form is sent to sign in', async () => {
  mockApi({ 'GET /auth/me/': visitor });

  renderRoute('/trips/new');

  expect(await screen.findByRole('heading', { name: 'Sign in', level: 1 })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'New trip' })).not.toBeInTheDocument();
});

test('saving a trip sends every field with the cover photo and opens the trip page', async () => {
  let sent = new FormData();
  mockApi({
    'GET /auth/me/': author,
    'POST /trips/': (init) => {
      sent = init.body as FormData;
      return Response.json(savedTrip, { status: 201 });
    },
  });
  renderRoute('/trips/new');

  const user = await fillInTrip();
  expect(screen.getByText('rome.jpg selected')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save trip' }));

  expect(
    await screen.findByRole('heading', { name: savedTrip.title, level: 1 }),
  ).toBeInTheDocument();
  expect(screen.getByText('Draft')).toBeInTheDocument();
  expect(Object.fromEntries(sent.entries())).toMatchObject({
    title: 'Rome and the Amalfi Coast',
    start_date: savedTrip.start_date,
    end_date: savedTrip.end_date,
    summary: 'Pasta and lemons.',
    status: 'draft',
  });
  expect((sent.get('cover_photo') as File).name).toBe('rome.jpg');
});

test('the overlap error from the API appears under the dates', async () => {
  const overlap = 'This trip overlaps "Lisbon long weekend" (18 May 2026 to 22 May 2026).';
  mockApi({
    'GET /auth/me/': author,
    'POST /trips/': Response.json({ start_date: [overlap] }, { status: 400 }),
  });
  renderRoute('/trips/new');

  const user = await fillInTrip();
  await user.click(screen.getByRole('button', { name: 'Save trip' }));

  expect(await screen.findByText(overlap)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'New trip', level: 1 })).toBeInTheDocument();
});

test('empty title and dates are flagged without calling the API', async () => {
  const fetchMock = mockApi({ 'GET /auth/me/': author });
  const user = userEvent.setup();
  renderRoute('/trips/new');

  await user.click(await screen.findByRole('button', { name: 'Save trip' }));

  expect(screen.getByText('Enter a title.')).toBeInTheDocument();
  expect(screen.getByText('Choose the start and end dates.')).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
});
