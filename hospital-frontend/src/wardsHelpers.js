export const WARD_TYPES = [
  'General',
  'Private',
  'Semi-private',
  'Maternity',
  'Pediatric',
  'Surgical',
  'Intensive care',
  'Emergency',
];

export const BED_STATUS = {
  AVAILABLE: { label: 'Available', pill: 'pill-in' },
  OCCUPIED: { label: 'Occupied', pill: 'pill-out' },
  MAINTENANCE: { label: 'Maintenance', pill: 'pill-warn' },
};

export const BILL_LABELS = {
  PAID: 'Paid',
  PENDING: 'Awaiting payment',
  PARTIALLY_PAID: 'Part paid',
  AWAITING_HMO: 'Awaiting HMO',
  REMOVED: 'Bill removed',
};

// 1.5 -> "1.50 days", 1 -> "1.00 day"
export function dayText(days) {
  const value = Number(days) || 0;
  return `${value.toFixed(2)} ${Math.abs(value - 1) < 0.005 ? 'day' : 'days'}`;
}