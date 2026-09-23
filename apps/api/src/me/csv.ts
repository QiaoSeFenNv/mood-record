import { formatOccurredAtLocal, moodBandName } from '@mood-record/domain';

import type { MoodRecordEntity } from '../database/entities/mood-record.entity.js';

/** 同时处理 RFC 4180 转义与常见表格软件的公式前缀。 */
function csvCell(input: string): string {
  const sanitized = /^[=+\-@\t\r]/.test(input) ? `'${input}` : input;
  return `"${sanitized.replaceAll('"', '""')}"`;
}

export function recordsToCsv(records: readonly MoodRecordEntity[]): string {
  const rows = ['occurred_at_local,timezone_offset,torque,mood_name'];
  for (const record of records) {
    rows.push(
      [
        formatOccurredAtLocal(record.occurredAtUtc, record.timezoneOffsetMinutes),
        String(record.timezoneOffsetMinutes),
        String(record.torque),
        moodBandName(record.moodBand),
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}
