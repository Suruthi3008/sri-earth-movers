const BADGE_CLASS = {
  Pending: 'badge-pending',
  'Partly Paid': 'badge-partial',
  Paid: 'badge-paid',
};

export const STATUS_COLORS = {
  Pending: '#DC2626',
  'Partly Paid': '#F5A524',
  Paid: '#16A34A',
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${BADGE_CLASS[status] || ''}`}>{status}</span>;
}
