const MIN_TIMEZONE_OFFSET = -840;
const MAX_TIMEZONE_OFFSET = 840;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export enum TimeRange {
  TODAY = 'TODAY',
}

export interface UtcWindow {
  startUtc: Date;
  endUtc: Date;
}

export function assertTimezoneOffset(timezoneOffsetMinutes: number): void {
  if (
    !Number.isInteger(timezoneOffsetMinutes) ||
    timezoneOffsetMinutes < MIN_TIMEZONE_OFFSET ||
    timezoneOffsetMinutes > MAX_TIMEZONE_OFFSET
  ) {
    throw new RangeError('时区偏移必须是 -840 到 840 之间的整数分钟');
  }
}

/**
 * 使用 JavaScript getTimezoneOffset 语义（UTC - 本地时间）计算当地自然日的 UTC 半开区间。
 */
export function localDayUtcWindow(referenceUtc: Date, timezoneOffsetMinutes: number): UtcWindow {
  assertTimezoneOffset(timezoneOffsetMinutes);
  if (Number.isNaN(referenceUtc.getTime())) throw new RangeError('参考时间无效');

  const localTimestamp = referenceUtc.getTime() - timezoneOffsetMinutes * MINUTE_MS;
  const local = new Date(localTimestamp);
  const localMidnightAsUtc = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  const startTimestamp = localMidnightAsUtc + timezoneOffsetMinutes * MINUTE_MS;
  return {
    startUtc: new Date(startTimestamp),
    endUtc: new Date(startTimestamp + DAY_MS),
  };
}

export function previousLocalDayWindows(
  referenceUtc: Date,
  timezoneOffsetMinutes: number,
  days: number,
): UtcWindow[] {
  if (!Number.isInteger(days) || days < 1 || days > 366) {
    throw new RangeError('天数必须是 1 到 366 之间的整数');
  }
  const today = localDayUtcWindow(referenceUtc, timezoneOffsetMinutes);
  return Array.from({ length: days }, (_, index) => {
    const start = today.startUtc.getTime() - (days - 1 - index) * DAY_MS;
    return { startUtc: new Date(start), endUtc: new Date(start + DAY_MS) };
  });
}

export function formatLocalDateKey(utcDate: Date, timezoneOffsetMinutes: number): string {
  assertTimezoneOffset(timezoneOffsetMinutes);
  const local = new Date(utcDate.getTime() - timezoneOffsetMinutes * MINUTE_MS);
  return local.toISOString().slice(0, 10);
}

export function formatOccurredAtLocal(occurredAtUtc: Date, timezoneOffsetMinutes: number): string {
  assertTimezoneOffset(timezoneOffsetMinutes);
  return new Date(occurredAtUtc.getTime() - timezoneOffsetMinutes * MINUTE_MS)
    .toISOString()
    .replace('Z', '');
}
