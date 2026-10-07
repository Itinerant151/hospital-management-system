export const STATUS_LABELS = {
  PENDING: 'Waiting for specimen',
  COLLECTED: 'Specimen collected',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};

export const FLAGS = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'ABNORMAL', label: 'Abnormal' },
];

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || 'Unknown';
}

export function flagLabel(flag) {
  return FLAGS.find((f) => f.value === flag)?.label || flag || '';
}

// Suggests Low / Normal / High by comparing a typed number with a reference range such as
// "4.0 - 11.0", "< 5.7" or "> 40". Returns '' when it cannot tell (staff then choose the flag).
export function suggestFlag(value, range) {
  if (!range) return '';
  const number = Number.parseFloat(String(value).replace(/,/g, ''));
  if (Number.isNaN(number)) return '';

  const text = String(range).replace(/,/g, '');

  const between = text.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (between) {
    const low = Number.parseFloat(between[1]);
    const high = Number.parseFloat(between[2]);
    if (number < low) return 'LOW';
    if (number > high) return 'HIGH';
    return 'NORMAL';
  }

  const below = text.match(/^\s*(?:<=|≤|<)\s*(-?\d+(?:\.\d+)?)/);
  if (below) return number > Number.parseFloat(below[1]) ? 'HIGH' : 'NORMAL';

  const above = text.match(/^\s*(?:>=|≥|>)\s*(-?\d+(?:\.\d+)?)/);
  if (above) return number < Number.parseFloat(above[1]) ? 'LOW' : 'NORMAL';

  return '';
}