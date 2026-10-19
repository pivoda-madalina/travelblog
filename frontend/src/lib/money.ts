/** 1,234.50 RON: the money format used across the site (BR-01). Works on the API's decimal
 * strings, so amounts never pass through floating point. */
export function formatRon(amount: string): string {
  const negative = amount.startsWith('-');
  const [whole = '0', fraction = ''] = amount.replace(/^[-+]/, '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}.${fraction.padEnd(2, '0').slice(0, 2)} RON`;
}
