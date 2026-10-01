// Formats a number as Nigerian naira, e.g. formatNaira(1500) -> "₦1,500.00"
export function formatNaira(amount) {
  const value = Number(amount) || 0;
  return `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}