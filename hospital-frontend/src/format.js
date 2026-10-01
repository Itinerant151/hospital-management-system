// Turns "2026-09-21T10:00" into "21 Sep 2026, 10:00". Falls back to the raw value.
export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}
