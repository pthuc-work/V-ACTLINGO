// ==============================================================================
// V-ACT HUB: Game Logic - Vietnam Timezone & Date Utilities
// Vietnam is strictly UTC+7 (Asia/Ho_Chi_Minh) without daylight saving time.
// ==============================================================================

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const VIETNAM_UTC_OFFSET_HOURS = 7;
export const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Normalizes any date, timestamp, or ISO string to a Date object where
 * UTC getters represent the date and time in Vietnam (UTC+7).
 */
export function toVietnamDate(input: Date | number | string = new Date()): Date {
  const time = typeof input === 'string' || typeof input === 'number'
    ? new Date(input).getTime()
    : input.getTime();

  if (isNaN(time)) {
    throw new Error(`Invalid date input: ${input}`);
  }

  return new Date(time + VIETNAM_UTC_OFFSET_MS);
}

/**
 * Formats a date/timestamp to 'YYYY-MM-DD' in Vietnam timezone.
 */
export function formatVietnamDate(input: Date | number | string = new Date()): string {
  const vn = toVietnamDate(input);
  const year = vn.getUTCFullYear();
  const month = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const day = String(vn.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the day of the week in Vietnam timezone (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
 */
export function getVietnamDayOfWeek(input: Date | number | string = new Date()): number {
  const vn = toVietnamDate(input);
  return vn.getUTCDay();
}

/**
 * Checks if a given date is Monday in Vietnam timezone.
 */
export function isVietnamMonday(input: Date | number | string = new Date()): boolean {
  return getVietnamDayOfWeek(input) === 1;
}

/**
 * Parses 'YYYY-MM-DD' into UTC millisecond timestamp corresponding to 00:00:00 UTC.
 */
function parseDateStrToUtcMs(dateStr: string): number {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid date string format (expected YYYY-MM-DD): ${dateStr}`);
  }
  return Date.UTC(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Adds (or subtracts) a number of days to a 'YYYY-MM-DD' date string.
 */
export function addDays(dateStr: string, days: number): string {
  const ms = parseDateStrToUtcMs(dateStr);
  const nextMs = ms + days * 24 * 60 * 60 * 1000;
  const d = new Date(nextMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the difference in calendar days (date2 - date1).
 * Example: '2026-11-25' - '2026-11-23' = 2
 */
export function getDaysDifference(startDateStr: string, endDateStr: string): number {
  const ms1 = parseDateStrToUtcMs(startDateStr);
  const ms2 = parseDateStrToUtcMs(endDateStr);
  return Math.round((ms2 - ms1) / (24 * 60 * 60 * 1000));
}

/**
 * Returns the Monday date ('YYYY-MM-DD') of the ISO week containing the given date.
 */
export function getMondayOfWeek(dateStr: string): string {
  const ms = parseDateStrToUtcMs(dateStr);
  const d = new Date(ms);
  const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return addDays(dateStr, -daysSinceMonday);
}

/**
 * Returns a list of missed calendar dates between startDate and endDate (exclusive).
 * E.g., from '2026-11-20' to '2026-11-23' -> ['2026-11-21', '2026-11-22']
 */
export function getMissedDates(startDateStr: string, endDateStr: string): string[] {
  const diff = getDaysDifference(startDateStr, endDateStr);
  if (diff <= 1) {
    return [];
  }

  const missed: string[] = [];
  for (let i = 1; i < diff; i++) {
    missed.push(addDays(startDateStr, i));
  }
  return missed;
}
