import { screen, waitFor, within } from '@testing-library/react';
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

const taxi = {
  id: 3,
  trip: 7,
  date: '2026-05-13',
  description: 'Taxi to airport',
  category: 'transport',
  amount: '120.00',
  currency: 'RON',
  rate: '1.000000',
  rate_source: 'nbr',
  amount_ron: '120.00',
};

function row(description: string): HTMLElement {
  return screen.getByText(description).closest('tr') as HTMLElement;
}

test('each expense shows its amount, the rate used and the RON amount', async () => {
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [EXPENSES]: [hotel, tickets, taxi],
  });

  renderRoute('/trips/7/budget');

  await screen.findByText('Hotel Trastevere');
  const hotelRow = within(row('Hotel Trastevere'));
  expect(hotelRow.getByText('12 May 2026')).toBeInTheDocument();
  expect(hotelRow.getByText('Accommodation')).toBeInTheDocument();
  expect(hotelRow.getByText('1,480.00 EUR')).toBeInTheDocument();
  expect(hotelRow.getByText('4.9750')).toBeInTheDocument();
  expect(hotelRow.getByText('NBR')).toBeInTheDocument();
  expect(hotelRow.getByText('7,363.00 RON')).toBeInTheDocument();
  const ticketsRow = within(row('Vatican tickets'));
  expect(ticketsRow.getByText('4.9802')).toBeInTheDocument();
  expect(ticketsRow.getByText('Manual')).toBeInTheDocument();
  expect(ticketsRow.getByText('298.81 RON')).toBeInTheDocument();
  // RON is not converted (BR-06).
  const taxiRow = within(row('Taxi to airport'));
  expect(taxiRow.getByText('-')).toBeInTheDocument();
  expect(taxiRow.queryByText('NBR')).not.toBeInTheDocument();
  expect(taxiRow.getAllByText('120.00 RON')).toHaveLength(2);
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
    'GET /rates/?currency=EUR&date=2026-05-13': {
      currency: 'EUR',
      date: '2026-05-13',
      rate: '4.975000',
      rate_date: '2026-05-12',
      detail: '',
    },
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
  // The suggested rate appears as soon as the date and currency are chosen (US-12).
  const rate = within(modal).getByLabelText(/Rate/);
  await waitFor(() => expect(rate).toHaveAttribute('placeholder', '4.9750'));
  expect(within(modal).getByText(/^NBR rate of 12 May 2026\./)).toBeInTheDocument();
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

test('a saved NBR rate is kept while the date and currency stay the same', async () => {
  let sent: unknown;
  const fetchMock = mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [EXPENSES]: [hotel],
    'PATCH /expenses/1/': (init) => {
      sent = body(init);
      return hotel;
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByText('Hotel Trastevere'));
  const modal = await screen.findByRole('dialog', { name: 'Edit expense' });
  const rate = within(modal).getByLabelText(/Rate/);
  expect(rate).toHaveValue('');
  expect(rate).toHaveAttribute('placeholder', '4.9750');
  expect(within(modal).getByText(/^The saved NBR rate\./)).toBeInTheDocument();
  const amount = within(modal).getByLabelText(/Amount/);
  await user.clear(amount);
  await user.type(amount, '1500');
  await user.click(within(modal).getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('Expense saved.')).toBeInTheDocument();
  expect(sent).toMatchObject({ amount: '1500', rate: null });
  const askedNbr = fetchMock.mock.calls.some(([input]) => String(input).startsWith('/api/rates/'));
  expect(askedNbr).toBe(false);
});

test('changing the date clears a typed rate and looks the NBR rate up again', async () => {
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [EXPENSES]: [tickets],
    'GET /rates/?currency=EUR&date=2026-05-14': {
      currency: 'EUR',
      date: '2026-05-14',
      rate: '4.981100',
      rate_date: '2026-05-14',
      detail: '',
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByText('Vatican tickets'));
  const modal = await screen.findByRole('dialog', { name: 'Edit expense' });
  const rate = within(modal).getByLabelText(/Rate/);
  expect(rate).toHaveValue('4.980200');
  await user.click(within(modal).getByRole('button', { name: /Date/ }));
  await user.click(screen.getByRole('button', { name: '14 May 2026' }));

  expect(rate).toHaveValue('');
  await waitFor(() => expect(rate).toHaveAttribute('placeholder', '4.9811'));
});

test('without an NBR rate for the currency the author is asked for one', async () => {
  const detail = 'The National Bank of Romania publishes no rate for VND. Enter the rate paid.';
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [EXPENSES]: [],
    'GET /rates/?currency=VND&date=2026-05-13': {
      currency: 'VND',
      date: '2026-05-13',
      rate: null,
      rate_date: null,
      detail,
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/budget');

  await user.click(await screen.findByRole('button', { name: '+ Add expense' }));
  const modal = await screen.findByRole('dialog', { name: 'Add expense' });
  await user.click(within(modal).getByRole('button', { name: /Date/ }));
  await user.click(screen.getByRole('button', { name: '13 May 2026' }));
  const currency = within(modal).getByRole('combobox', { name: /Currency/ });
  await user.clear(currency);
  await user.type(currency, 'VND');

  expect(await within(modal).findByText(detail)).toBeInTheDocument();
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
