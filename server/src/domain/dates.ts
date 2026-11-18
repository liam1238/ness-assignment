const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseCalendarDate(value: string): string | null {
  if (!DATE_REGEX.test(value)) {
    return null;
  }
  const [y, m, d] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== m - 1 ||
    utc.getUTCDate() !== d
  ) {
    return null;
  }
  return value;
}

export function compareDateStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}