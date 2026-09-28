import { describe, expect, it, vi } from 'vitest';
import { MoodBand, torqueToMoodBand } from '@mood-record/domain';

import type { MoodRecordEntity } from '../database/entities/mood-record.entity.js';
import type { MoodRepository } from '../repositories/mood.repository.js';
import { ReviewService } from './review.service.js';

function createRecord(id: string, occurredAtUtc: string, torque: number): MoodRecordEntity {
  return {
    id,
    userId: 'user-1',
    torque,
    moodBand: torqueToMoodBand(torque),
    occurredAtUtc: new Date(occurredAtUtc),
    timezoneOffsetMinutes: -480,
    clientMutationId: id,
    createdAtUtc: new Date(occurredAtUtc),
  };
}

describe('ReviewService weekly insights', () => {
  it('reports record count, common direction periods, and same-day change', async () => {
    const records = [
      createRecord('morning-low', '2026-09-23T02:00:00.000Z', -40),
      createRecord('evening-high', '2026-09-23T12:00:00.000Z', 50),
    ];
    const findForUserInWindow = vi.fn().mockResolvedValue(records);
    const service = new ReviewService({ findForUserInWindow } as unknown as MoodRepository);

    const result = await service.weekly('user-1', -480, '2026-09-24');

    expect(result.days.find((day) => day.date === '2026-09-23')).toMatchObject({
      recordCount: 2,
      averageTorque: 5,
      moodBands: [MoodBand.LOW, MoodBand.HAPPY],
    });
    expect(result.insights).toEqual(
      expect.arrayContaining([
        '过去 7 天记录了 2 次，分布在 1 天。',
        '较低扭矩记录较多出现在上午。',
        '较高扭矩记录较多出现在晚上。',
        '2026-09-23 内，最后一次记录的扭矩比第一次上升了 90。',
      ]),
    );
  });

  it('keeps neutral insights for empty and calm-only weeks', async () => {
    const findForUserInWindow = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createRecord('calm', '2026-09-23T04:00:00.000Z', 0)]);
    const service = new ReviewService({ findForUserInWindow } as unknown as MoodRepository);

    const empty = await service.weekly('user-1', -480, '2026-09-24');
    const calmOnly = await service.weekly('user-1', -480, '2026-09-24');

    expect(empty.insights).toEqual(['过去 7 天还没有记录，想记的时候再来就好。']);
    expect(calmOnly.insights).toEqual(['过去 7 天记录了 1 次，分布在 1 天。']);
  });
});
