export const DAYS = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun' },
];

// Bookable appointment times (the same grid the booking forms use)
export const ALL_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

// Start and end times a visiting window can use
export const HOURS = [...ALL_SLOTS, '18:00'];

// "2026-10-05" -> "MONDAY"
export function dayKeyOf(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const jsDay = new Date(year, month - 1, day).getDay(); // 0 = Sunday
  return DAYS[(jsDay + 6) % 7].key;
}

// The bookable times a visiting doctor offers on a given date ([] when they do not visit that day)
export function allowedTimes(visiting, dateString) {
  if (!visiting || !dateString) return [];
  const window = (visiting.schedule || []).find((s) => s.day === dayKeyOf(dateString));
  if (!window) return [];
  return ALL_SLOTS.filter((t) => t >= window.startTime && t < window.endTime);
}

// "Mon 09:00-13:00, Wed 14:00-17:00"
export function describeSchedule(schedule) {
  if (!schedule || schedule.length === 0) return 'No visiting days set';
  return schedule
    .map((s) => `${DAYS.find((d) => d.key === s.day)?.short || s.day} ${s.startTime}-${s.endTime}`)
    .join(', ');
}

// Returns a message when the schedule is not usable, or '' when it is fine
export function scheduleProblem(schedule) {
  if (!schedule || schedule.length === 0) return 'Tick at least one visiting day.';
  for (const slot of schedule) {
    if (slot.startTime >= slot.endTime) {
      const label = DAYS.find((d) => d.key === slot.day)?.label || slot.day;
      return `${label}: the end time must be later than the start time.`;
    }
  }
  return '';
}