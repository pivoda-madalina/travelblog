/** 1,234.50 RON: the money format used across the site (BR-01). Works on the API's decimal
 * strings, so amounts never pass through floating point. */
export function formatRon(amount: string): string {
  const negative = amount.startsWith('-');
  const [whole = '0', fraction = ''] = amount.replace(/^[-+]/, '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}.${fraction.padEnd(2, '0').slice(0, 2)} RON`;
}

/** 4.9750 or 0.030125: a rate of RON per 1 unit with at least 4 decimal places, as the NBR
 * publishes them, and without the trailing zeros of the API's 6. */
export function formatRate(rate: string): string {
  const [whole = '0', fraction = ''] = rate.split('.');
  return `${whole}.${fraction.replace(/0+$/, '').padEnd(4, '0')}`;
}
