import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockApi, wasRequested } from '../../test/mockApi';
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

const hotel = {
  id: 1,
  trip: 7,
  date: '2026-05-12',
  description: 'Hotel Trastevere',
  category: 'accommodation',
  amount: '1480.00',
  currency: 'EUR',
  rate: '4.975000',
  rate_source: 'nbr',
  amount_ron: '7363.00',
};

const tickets = {
  id: 2,
  trip: 7,
  date: '2026-05-13',
  description: 'Vatican tickets',
  category: 'activities',
  amount: '60.00',
  currency: 'EUR',
  rate: '4.980200',
  rate_source: 'manual',
  amount_ron: '298.81',
};

const EXPENSES = 'GET /expenses/?trip=7';

function body(init: RequestInit): unknown {
  return JSON.parse(init.body as string);
}

test('the expenses are listed with their category and amount', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/7/': trip, [EXPENSES]: [hotel, tickets] });

  renderRoute('/trips/7/budget');

  const row = (await screen.findByText('Hotel Trastevere')).closest('tr') as HTMLElement;
  expect(within(row).getByText('12 May 2026')).toBeInTheDocument();
  expect(within(row).getByText('Accommodation')).toBeInTheDocument();
  expect(within(row).getByText('1,480.00 EUR')).toBeInTheDocument();
  expect(screen.getByText('Vatican tickets')).toBeInTheDocument();
});

test('without expenses the tab says so', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/7/': trip, [EXPENSES]: [] });

  renderRoute('/trips/7/budget');

  expect(await screen.findByText('No expenses yet.')).toBeInTheDocument();
});

test('the author adds an expense in another currency', async () => {
  let sent: unknown;
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [EXPENSES]: [],
    'POST /expenses/': (init) => {
      sent = body(init);
      return Response.json(tickets, { status: 201 });
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByRole('button', { name: '+ Add expense' }));
  const modal = await screen.findByRole('dialog', { name: 'Add expense' });
  await user.click(within(modal).getByRole('button', { name: /Date/ }));
  await user.click(screen.getByRole('button', { name: '13 May 2026' }));
  await user.type(within(modal).getByLabelText(/Description/), 'Vatican tickets');
  await user.click(within(modal).getByRole('combobox', { name: /Category/ }));
  await user.click(screen.getByRole('option', { name: 'Activities' }));
  await user.type(within(modal).getByLabelText(/Amount/), '1,060.00');
  const currency = within(modal).getByRole('combobox', { name: /Currency/ });
  await user.clear(currency);
  await user.type(currency, 'eur');
  await user.click(within(modal).getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('Expense saved.')).toBeInTheDocument();
  expect(sent).toEqual({
    trip: 7,
    date: '2026-05-13',
    description: 'Vatican tickets',
    category: 'activities',
    amount: '1060.00',
    currency: 'EUR',
    rate: null,
  });
});

test('the rate field is hidden for RON and sent when typed', async () => {
  let sent: unknown;
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [EXPENSES]: [tickets],
    'PATCH /expenses/2/': (init) => {
      sent = body(init);
      return tickets;
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByText('Vatican tickets'));
  const modal = await screen.findByRole('dialog', { name: 'Edit expense' });
  const rate = within(modal).getByLabelText(/Rate/);
  expect(rate).toHaveValue('4.980200');
  await user.clear(rate);
  await user.type(rate, '4.99');
  await user.click(within(modal).getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('Expense saved.')).toBeInTheDocument();
  expect(sent).toMatchObject({ currency: 'EUR', rate: '4.99' });

  await user.click(screen.getByText('Vatican tickets'));
  const again = await screen.findByRole('dialog', { name: 'Edit expense' });
  const currency = within(again).getByRole('combobox', { name: /Currency/ });
  await user.clear(currency);
  await user.type(currency, 'RON');
  expect(within(again).queryByLabelText(/Rate/)).not.toBeInTheDocument();
});

test('an NBR rate is not shown in the form, so the NBR is asked again', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/7/': trip, [EXPENSES]: [hotel] });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByText('Hotel Trastevere'));
  const modal = await screen.findByRole('dialog', { name: 'Edit expense' });

  expect(within(modal).getByLabelText(/Rate/)).toHaveValue('');
  expect(within(modal).getByLabelText(/Amount/)).toHaveValue('1480.00');
});

test('errors from the API appear under their fields', async () => {
  const amountError = 'The amount must be greater than zero.';
  const rateError = 'The National Bank of Romania publishes no rate for VND. Enter the rate paid.';
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [EXPENSES]: [tickets],
    'PATCH /expenses/2/': Response.json(
      { amount: [amountError], rate: [rateError] },
      { status: 400 },
    ),
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByText('Vatican tickets'));
  const modal = await screen.findByRole('dialog', { name: 'Edit expense' });
  await user.click(within(modal).getByRole('button', { name: 'Save' }));

  expect(await within(modal).findByText(amountError)).toBeInTheDocument();
  expect(within(modal).getByText(rateError)).toBeInTheDocument();
});

test('missing fields and a bad currency are flagged without calling the API', async () => {
  const fetchMock = mockApi({ 'GET /auth/me/': author, 'GET /trips/7/': trip, [EXPENSES]: [] });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByRole('button', { name: '+ Add expense' }));
  const modal = await screen.findByRole('dialog', { name: 'Add expense' });
  const currency = within(modal).getByRole('combobox', { name: /Currency/ });
  await user.clear(currency);
  await user.type(currency, 'E1');
  await user.click(within(modal).getByRole('button', { name: 'Save' }));

  expect(within(modal).getByText('Choose the date.')).toBeInTheDocument();
  expect(within(modal).getByText('Enter a description.')).toBeInTheDocument();
  expect(within(modal).getByText('Choose a category.')).toBeInTheDocument();
  expect(within(modal).getByText('Enter the amount.')).toBeInTheDocument();
  expect(
    within(modal).getByText('Enter a three-letter currency code, for example EUR.'),
  ).toBeInTheDocument();
  expect(wasRequested(fetchMock, 'POST', '/expenses/')).toBe(false);
});

test('the author deletes an expense after confirming', async () => {
  const fetchMock = mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [EXPENSES]: [tickets],
    'DELETE /expenses/2/': new Response(null, { status: 204 }),
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByText('Vatican tickets'));
  const modal = await screen.findByRole('dialog', { name: 'Edit expense' });
  await user.click(within(modal).getByRole('button', { name: 'Delete' }));
  expect(within(modal).getByText('Delete ‘Vatican tickets’?')).toBeInTheDocument();
  await user.click(within(modal).getByRole('button', { name: 'Delete' }));

  expect(await screen.findByText('Expense deleted.')).toBeInTheDocument();
  expect(wasRequested(fetchMock, 'DELETE', '/expenses/2/')).toBe(true);
});
