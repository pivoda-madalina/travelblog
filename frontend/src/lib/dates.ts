import dayjs from 'dayjs';

/** 12 May 2026, the date format used across the site (docs/ui-design.md). */
export function formatDate(date: string): string {
  return dayjs(date).format('D MMM YYYY');
}

/** 12 May - 20 May 2026, or one date for a single-day trip. */
export function formatDateRange(start: string, end: string): string {
  if (start === end) {
    return formatDate(start);
  }
  const startFormat = dayjs(start).year() === dayjs(end).year() ? 'D MMM' : 'D MMM YYYY';
  return `${dayjs(start).format(startFormat)} - ${formatDate(end)}`;
}
