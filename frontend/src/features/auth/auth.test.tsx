import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockApi, wasRequested } from '../../test/mockApi';
import { renderRoute } from '../../test/render';

const visitor = { is_author: false, username: null };
const author = { is_author: true, username: 'madalina' };

const wrongCredentials = Response.json(
  { non_field_errors: ['Wrong username or password.'] },
  { status: 400 },
);

async function fillInSignIn(username: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Username'), username);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

test('a visitor sees the Sign in button and no author menu', async () => {
  mockApi({ 'GET /auth/me/': visitor });

  renderRoute('/');

  expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'madalina' })).not.toBeInTheDocument();
});

test('the author sees their menu and can sign out', async () => {
  const fetchMock = mockApi({
    'GET /auth/me/': author,
    'POST /auth/logout/': new Response(null, { status: 204 }),
  });
  const user = userEvent.setup();
  renderRoute('/');

  await user.click(await screen.findByRole('button', { name: 'madalina' }));
  await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

  expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  expect(wasRequested(fetchMock, 'POST', '/auth/logout/')).toBe(true);
});

test('signing in returns the author to the page they came from', async () => {
  const fetchMock = mockApi({
    'GET /auth/me/': visitor,
    'GET /auth/csrf/': new Response(null, { status: 204 }),
    'POST /auth/login/': author,
  });
  const user = userEvent.setup();
  renderRoute('/map');

  await user.click(await screen.findByRole('link', { name: 'Sign in' }));
  await fillInSignIn('madalina', 'password');

  expect(await screen.findByRole('heading', { name: 'World map', level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'madalina' })).toBeInTheDocument();
  expect(wasRequested(fetchMock, 'GET', '/auth/csrf/')).toBe(true);
});

test('wrong credentials show an error and keep the author on the sign-in screen', async () => {
  mockApi({
    'GET /auth/me/': visitor,
    'GET /auth/csrf/': new Response(null, { status: 204 }),
    'POST /auth/login/': wrongCredentials,
  });
  renderRoute('/sign-in');

  await fillInSignIn('madalina', 'wrong');

  expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password.');
  expect(screen.getByRole('heading', { name: 'Sign in', level: 1 })).toBeInTheDocument();
});

test('empty fields are flagged without calling the API', async () => {
  const fetchMock = mockApi({ 'GET /auth/me/': visitor });
  const user = userEvent.setup();
  renderRoute('/sign-in');

  await user.click(screen.getByRole('button', { name: 'Sign in' }));

  expect(screen.getByText('Enter your username.')).toBeInTheDocument();
  expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  expect(wasRequested(fetchMock, 'POST', '/auth/login/')).toBe(false);
});

test('a signed-in author who opens the sign-in screen goes to the home page', async () => {
  mockApi({ 'GET /auth/me/': author });

  renderRoute('/sign-in');

  expect(await screen.findByRole('heading', { name: 'Trips', level: 1 })).toBeInTheDocument();
});
