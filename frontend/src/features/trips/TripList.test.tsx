import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockApi } from '../../test/mockApi';
import { renderRoute } from '../../test/render';

const author = { is_author: true, username: 'madalina' };
const visitor = { is_author: false, username: null };

function trip(overrides: object) {
  return {
    id: 1,
    title: 'Rome and the Amalfi Coast',
    start_date: '2026-05-12',
    end_date: '2026-05-20',
    summary: 'Pasta and lemons.',
    cover_photo: '/media/covers/rome.jpg',
    status: 'published',
    created_at: '2026-10-18T10:00:00Z',
    countries: ['Italy'],
    ...overrides,
  };
}

const rome = trip({});
const japan = trip({
  id: 2,
  title: 'Japan in spring',
  start_date: '2027-04-02',
  end_date: '2027-04-18',
  cover_photo: null,
  status: 'draft',
  countries: [],
});

test('each card shows the cover, title, dates and countries and links to the trip', async () => {
  mockApi({ 'GET /auth/me/': visitor, 'GET /trips/': [rome] });

  renderRoute('/');

  const card = await screen.findByRole('link', { name: /Rome and the Amalfi Coast/ });
  expect(card).toHaveAttribute('href', '/trips/1');
  expect(within(card).getByText('12 May - 20 May 2026')).toBeInTheDocument();
  expect(within(card).getByText('Italy')).toBeInTheDocument();
  expect(card.querySelector('img')).toHaveAttribute('src', rome.cover_photo);
});

test('the author sees drafts marked as such, and a trip without places shows no countries', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/': [japan, rome] });

  renderRoute('/');

  const card = await screen.findByRole('link', { name: /Japan in spring/ });
  expect(within(card).getByText('Draft')).toBeInTheDocument();
  expect(within(card).getByText('2 Apr - 18 Apr 2027')).toBeInTheDocument();
  expect(within(card).queryByText('Italy')).not.toBeInTheDocument();
  const romeCard = screen.getByRole('link', { name: /Rome and the Amalfi Coast/ });
  expect(within(romeCard).queryByText('Draft')).not.toBeInTheDocument();
});

test('an empty list says so, with a create button for the author only', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/': [] });

  renderRoute('/');

  expect(await screen.findByText('No trips yet.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Create your first trip' })).toHaveAttribute(
    'href',
    '/trips/new',
  );
});

test('a visitor sees the empty list without the create button', async () => {
  mockApi({ 'GET /auth/me/': visitor, 'GET /trips/': [] });

  renderRoute('/');

  expect(await screen.findByText('No trips yet.')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Create your first trip' })).not.toBeInTheDocument();
});

test('the trip page shows the dates and countries with the route, journal and photos tabs', async () => {
  mockApi({
    'GET /auth/me/': visitor,
    'GET /trips/1/': { ...rome, countries: ['Italy', 'France'] },
  });
  const user = userEvent.setup();

  renderRoute('/trips/1');

  expect(await screen.findByText('12 May - 20 May 2026 · Italy, France')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Route' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
    'Route',
    'Journal',
    'Photos',
  ]);
  await user.click(screen.getByRole('tab', { name: 'Journal' }));
  expect(screen.getByRole('tab', { name: 'Journal' })).toHaveAttribute('aria-selected', 'true');
});

test('the author also gets the Budget tab', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/1/': rome });

  renderRoute('/trips/1/budget');

  expect(await screen.findByRole('tab', { name: 'Budget' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('a visitor who opens the budget URL is returned to the Route tab', async () => {
  mockApi({ 'GET /auth/me/': visitor, 'GET /trips/1/': rome });

  renderRoute('/trips/1/budget');

  const route = await screen.findByRole('tab', { name: 'Route' });
  await waitFor(() => expect(route).toHaveAttribute('aria-selected', 'true'));
  expect(screen.queryByRole('tab', { name: 'Budget' })).not.toBeInTheDocument();
});
