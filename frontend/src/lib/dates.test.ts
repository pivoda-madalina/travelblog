import { formatDate, formatDateRange } from './dates';

test('dates are shown as day, short month and year', () => {
  expect(formatDate('2026-05-12')).toBe('12 May 2026');
});

test.each([
  ['2026-05-12', '2026-05-20', '12 May - 20 May 2026'],
  ['2026-12-28', '2027-01-03', '28 Dec 2026 - 3 Jan 2027'],
  ['2026-05-12', '2026-05-12', '12 May 2026'],
])('%s to %s is shown as "%s"', (start, end, expected) => {
  expect(formatDateRange(start, end)).toBe(expected);
});
