import { screen, within } from '@testing-library/react';
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

const overBudget = {
  planned: '5000.00',
  spent: '5412.30',
  difference: '-412.30',
  over_budget: true,
  categories: [
    { category: 'accommodation', spent: '2400.00' },
    { category: 'food_and_drinks', spent: '1310.50' },
    { category: 'transport', spent: '890.00' },
    { category: 'activities', spent: '611.80' },
    { category: 'shopping', spent: '200.00' },
    { category: 'other', spent: '0.00' },
  ],
};

const BUDGET = 'GET /trips/7/budget/';

function card(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

test('the summary shows spent, the difference and each category in RON', async () => {
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'GET /expenses/?trip=7': [taxi],
    [BUDGET]: overBudget,
  });

  renderRoute('/trips/7/budget');

  expect(await screen.findByText('By category')).toBeInTheDocument();
  expect(within(card('Spent')).getByText('5,412.30 RON')).toBeInTheDocument();
  expect(within(card('Difference')).getByText('-412.30 RON')).toBeInTheDocument();
  const bars = screen.getAllByRole('progressbar');
  expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual([
    'Accommodation',
    'Food and drinks',
    'Transport',
    'Activities',
    'Shopping',
    'Other',
  ]);
  const accommodation = bars[0]?.closest('.mantine-Group-root') as HTMLElement;
  expect(within(accommodation).getByText('2,400.00 RON')).toBeInTheDocument();
});

test('spending over the planned budget is highlighted', async () => {
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'GET /expenses/?trip=7': [],
    [BUDGET]: overBudget,
  });

  renderRoute('/trips/7/budget');

  expect(await screen.findByText('over budget')).toBeInTheDocument();
});

test('spending within the planned budget is not flagged', async () => {
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'GET /expenses/?trip=7': [taxi],
    [BUDGET]: {
      ...overBudget,
      spent: '120.00',
      difference: '4880.00',
      over_budget: false,
    },
  });

  renderRoute('/trips/7/budget');

  expect(await screen.findByText('4,880.00 RON')).toBeInTheDocument();
  expect(screen.queryByText('over budget')).not.toBeInTheDocument();
});

test('without a planned budget the difference is not set', async () => {
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': { ...trip, planned_budget: null },
    'GET /expenses/?trip=7': [taxi],
    [BUDGET]: { ...overBudget, planned: null, difference: null, over_budget: false },
  });

  renderRoute('/trips/7/budget');

  await screen.findByText('By category');
  expect(within(card('Difference')).getByText('Not set')).toBeInTheDocument();
  expect(within(card('Spent')).getByText('5,412.30 RON')).toBeInTheDocument();
});

test('the expense table ends with the total', async () => {
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'GET /expenses/?trip=7': [taxi],
    [BUDGET]: { ...overBudget, spent: '120.00', difference: '4880.00', over_budget: false },
  });

  renderRoute('/trips/7/budget');

  const total = (await screen.findByText('Total')).closest('tr') as HTMLElement;
  expect(within(total).getByText('120.00 RON')).toBeInTheDocument();
});

test('changing the planned budget refreshes the difference', async () => {
  let planned = '5000.00';
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    'GET /expenses/?trip=7': [],
    [BUDGET]: () => ({
      ...overBudget,
      planned,
      difference: planned === '5000.00' ? '-412.30' : '587.70',
      over_budget: planned === '5000.00',
    }),
    'PATCH /trips/7/': () => {
      planned = '6000.00';
      return { ...trip, planned_budget: planned };
    },
  });

  renderRoute('/trips/7/budget');

  await screen.findByText('over budget');
  await userEvent.click(screen.getByRole('button', { name: 'Edit planned budget' }));
  const input = screen.getByLabelText('Planned budget');
  await userEvent.clear(input);
  await userEvent.type(input, '6000');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('587.70 RON')).toBeInTheDocument();
  expect(screen.queryByText('over budget')).not.toBeInTheDocument();
});
