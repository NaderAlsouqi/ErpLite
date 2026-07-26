/**
 * Amount formatting / parsing helpers — the single source of truth so that
 * display and parsing always stay inverses of each other.
 *
 * Amounts are displayed en-US: comma thousands-separators + period decimal
 * (e.g. 1234.56 → "1,234.56"). `parseAmount` strips those separators before
 * `parseFloat`, because plain `parseFloat("1,234.56")` stops at the comma and
 * wrongly returns 1. Always pair display (`formatAmount`) with `parseAmount`
 * for any totals/sorting on the formatted string.
 */

/** Parse a (possibly en-US formatted) amount back to a number. Returns 0 for blanks/NaN. */
export function parseAmount(value: unknown): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const n = parseFloat(String(value ?? '').replace(/,/g, '').replace(/\s/g, ''));
  return isNaN(n) ? 0 : n;
}

/** Format a number (or formatted string) as a grouped, fixed-decimal en-US amount. */
export function formatAmount(value: unknown, decimals = 2): string {
  return parseAmount(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
