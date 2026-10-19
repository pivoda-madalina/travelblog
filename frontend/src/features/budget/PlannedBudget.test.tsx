import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockApi } from '../../test/mockApi';
import { renderRoute } from '../../test/render';

const author = { is_author: true, username: 'madalina' };

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

function body(init: RequestInit): unknown {
  return JSON.parse(init.body as string);
}

test('the planned budget is shown in RON', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/7/': trip });

  renderRoute('/trips/7/budget');

  expect(await screen.findByText('5,000.00 RON')).toBeInTheDocument();
});

test('without a planned budget the card says it is not set', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/7/': { ...trip, planned_budget: null } });

  renderRoute('/trips/7/budget');

  expect(await screen.findByText('Not set')).toBeInTheDocument();
});

test('the author edits the planned budget in place', async () => {
  let sent: unknown;
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'PATCH /trips/7/': (init) => {
      sent = body(init);
      return { ...trip, planned_budget: '6500.50' };
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByRole('button', { name: 'Edit planned budget' }));
  const input = screen.getByLabelText('Planned budget');
  expect(input).toHaveValue('5000.00');
  await user.clear(input);
  await user.type(input, '6,500.50');
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('6,500.50 RON')).toBeInTheDocument();
  expect(sent).toEqual({ planned_budget: '6500.50' });
});

test('clearing the planned budget sends null', async () => {
  let sent: unknown;
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'PATCH /trips/7/': (init) => {
      sent = body(init);
      return { ...trip, planned_budget: null };
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByRole('button', { name: 'Edit planned budget' }));
  await user.clear(screen.getByLabelText('Planned budget'));
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('Not set')).toBeInTheDocument();
  expect(sent).toEqual({ planned_budget: null });
});

test('a negative amount shows the error from the API', async () => {
  const error = 'Ensure this value is greater than or equal to 0.';
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'PATCH /trips/7/': Response.json({ planned_budget: [error] }, { status: 400 }),
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByRole('button', { name: 'Edit planned budget' }));
  await user.clear(screen.getByLabelText('Planned budget'));
  await user.type(screen.getByLabelText('Planned budget'), '-1');
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText(error)).toBeInTheDocument();
});

test('cancelling keeps the saved planned budget', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/7/': trip });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByRole('button', { name: 'Edit planned budget' }));
  await user.type(screen.getByLabelText('Planned budget'), '99');
  await user.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(screen.getByText('5,000.00 RON')).toBeInTheDocument();
});
