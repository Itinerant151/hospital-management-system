// Shared helpers for the billing screens (bill status, HMO claim status, payment methods)

export const STATUS_LABELS = {
  PENDING: 'Pending',
  PARTIALLY_PAID: 'Partially paid',
  AWAITING_HMO: 'Awaiting HMO',
  PAID: 'Paid',
};

export const CLAIM_LABELS = {
  NONE: 'No HMO',
  PENDING: 'Claim pending',
  APPROVED: 'Claim approved',
  PARTIALLY_APPROVED: 'Partially approved',
  REJECTED: 'Claim rejected',
};

export const STAFF_METHODS = ['Cash', 'Card', 'Bank Transfer'];
export const PATIENT_METHODS = ['Card', 'Bank Transfer'];

export const statusLabel = (status) => STATUS_LABELS[status] || status || '—';
export const claimLabel = (status) => CLAIM_LABELS[status || 'NONE'] || status;

export function statusBadge(status) {
  if (status === 'PAID') return 'badge badge-completed';
  if (status === 'PARTIALLY_PAID') return 'badge badge-partial';
  if (status === 'AWAITING_HMO') return 'badge badge-hmo';
  return 'badge badge-scheduled';
}

export function claimBadge(status) {
  if (status === 'APPROVED') return 'badge badge-completed';
  if (status === 'PARTIALLY_APPROVED') return 'badge badge-partial';
  if (status === 'REJECTED') return 'badge badge-cancelled';
  return 'badge badge-scheduled';
}

// Receipt number of the most recent payment on a bill, or null
export function lastReceipt(bill) {
  const payments = bill.payments || [];
  return payments.length ? payments[payments.length - 1].receiptNumber : null;
}

// 80 -> "80%", 12.5 -> "12.5%"
export function percentText(value) {
  const n = Number(value) || 0;
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

// Has the HMO agreed to pay, but not paid yet?
export const awaitingHmoPayment = (bill) =>
  !bill.hmoPaid && (bill.claimStatus === 'APPROVED' || bill.claimStatus === 'PARTIALLY_APPROVED');