import { screen } from '@testing-library/react';

import { mockApi } from './test/mockApi';
import { renderRoute } from './test/render';

beforeEach(() => {
  mockApi({
    'GET /auth/me/': { is_author: false, username: null },
    'GET /trips/12/': {
      id: 12,
      title: 'Rome and the Amalfi Coast',
      start_date: '2026-05-12',
      end_date: '2026-05-20',
      summary: '',
      cover_photo: null,
      status: 'published',
      created_at: '2026-04-01T10:00:00Z',
      countries: [],
    },
  });
});

test('the trip list is the home page and the header links to every section', async () => {
  renderRoute('/');

  expect(screen.getByRole('heading', { name: 'Trips', level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Trips' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'World map' })).toHaveAttribute('href', '/map');
  expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
});

test.each([
  ['/trips/12', 'Rome and the Amalfi Coast'],
  ['/trips/99', 'Trip not found'],
  ['/map', 'World map'],
  ['/sign-in', 'Sign in'],
  ['/no-such-page', 'Page not found'],
])('%s shows the "%s" page', async (path, heading) => {
  renderRoute(path);

  expect(await screen.findByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
});
