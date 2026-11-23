/** Shared display helpers. Money uses Indian grouping, e.g. ₹1,95,000 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatINR(value) {
  return inrFormatter.format(Number(value) || 0);
}

/** Converts 2025-11-05 to 05/11/2025 */
export function formatDate(value) {
  if (!value) return '';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

/** Today's date in local time as YYYY-MM-DD (for date inputs) */
export function todayISO() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now - offsetMs).toISOString().slice(0, 10);
}
