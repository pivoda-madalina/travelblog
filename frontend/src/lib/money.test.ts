import { formatRate, formatRon } from './money';

test.each([
  ['0', '0.00 RON'],
  ['0.00', '0.00 RON'],
  ['5000.00', '5,000.00 RON'],
  ['1234.5', '1,234.50 RON'],
  ['999.99', '999.99 RON'],
  ['1234567890.12', '1,234,567,890.12 RON'],
  ['-412.30', '-412.30 RON'],
])('%s is shown as %s', (amount, shown) => {
  expect(formatRon(amount)).toBe(shown);
});

test.each([
  ['4.975000', '4.9750'],
  ['4.976400', '4.9764'],
  ['0.030125', '0.030125'],
  ['0.000175', '0.000175'],
  ['1.000000', '1.0000'],
  ['5', '5.0000'],
])('the rate %s is shown as %s', (rate, shown) => {
  expect(formatRate(rate)).toBe(shown);
});
