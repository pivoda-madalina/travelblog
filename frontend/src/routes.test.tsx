import { screen } from '@testing-library/react';

import { renderRoute } from './test/render';

test('the trip list is the home page and the header links to every section', () => {
  renderRoute('/');

  expect(screen.getByRole('heading', { name: 'Trips', level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Trips' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'World map' })).toHaveAttribute('href', '/map');
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
});

test.each([
  ['/trips/12', 'Trip 12'],
  ['/map', 'World map'],
  ['/sign-in', 'Sign in'],
  ['/no-such-page', 'Page not found'],
])('%s shows the "%s" page', (path, heading) => {
  renderRoute(path);

  expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
});
