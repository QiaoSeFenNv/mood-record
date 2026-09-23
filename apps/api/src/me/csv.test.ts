import { describe, expect, it } from 'vitest';
import { MoodBand } from '@mood-record/domain';

import { recordsToCsv } from './csv.js';
import type { MoodRecordEntity } from '../database/entities/mood-record.entity.js';

describe('CSV export', () => {
  it('adds UTF-8 BOM and escapes negative numeric-looking cells from formulas', () => {
    const record = {
      occurredAtUtc: new Date('2026-09-22T00:00:00.000Z'),
      timezoneOffsetMinutes: -480,
      torque: -61,
      moodBand: MoodBand.VERY_LOW,
    } as MoodRecordEntity;
    const csv = recordsToCsv([record]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"\'-480","\'-61","很低落"');
    expect(csv).toContain('\r\n');
  });
});
