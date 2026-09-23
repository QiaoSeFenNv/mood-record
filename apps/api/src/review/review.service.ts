import { Inject, Injectable } from '@nestjs/common';
import { type CalendarResponse, type WeeklyResponse } from '@mood-record/contracts';
import { formatLocalDateKey, previousLocalDayWindows, type UtcWindow } from '@mood-record/domain';

import type { MoodRecordEntity } from '../database/entities/mood-record.entity.js';
import { MoodRepository } from '../repositories/mood.repository.js';

@Injectable()
export class ReviewService {
  constructor(@Inject(MoodRepository) private readonly repository: MoodRepository) {}

  async weekly(
    userId: string,
    timezoneOffsetMinutes: number,
    anchorDate?: string,
  ): Promise<WeeklyResponse> {
    const reference = anchorDate
      ? new Date(Date.parse(`${anchorDate}T12:00:00.000Z`) + timezoneOffsetMinutes * 60_000)
      : new Date();
    const windows = previousLocalDayWindows(reference, timezoneOffsetMinutes, 7);
    const all = await this.repository.findForUserInWindow(userId, {
      startUtc: windows[0]!.startUtc,
      endUtc: windows[6]!.endUtc,
    });
    const days = windows.map((window) => {
      const records = all.filter(
        (record) => record.occurredAtUtc >= window.startUtc && record.occurredAtUtc < window.endUtc,
      );
      return {
        date: formatLocalDateKey(window.startUtc, timezoneOffsetMinutes),
        recordCount: records.length,
        averageTorque: records.length
          ? Math.round(records.reduce((sum, record) => sum + record.torque, 0) / records.length)
          : null,
        moodBands: records.map((record) => record.moodBand),
      };
    });
    const total = all.length;
    const activeDays = days.filter((day) => day.recordCount > 0).length;
    const insights = total
      ? [`过去 7 天记录了 ${total} 次，分布在 ${activeDays} 天。`]
      : ['过去 7 天还没有记录，想记的时候再来就好。'];
    if (total >= 2) {
      const first = all[0]!;
      const last = all[all.length - 1]!;
      const difference = last.torque - first.torque;
      if (difference !== 0) {
        insights.push(
          `从第一条到最近一条，扭矩${difference > 0 ? '上升' : '下降'}了 ${Math.abs(difference)}。`,
        );
      }
    }
    return { days, insights, serverTime: new Date().toISOString() };
  }

  async calendar(
    userId: string,
    year: number,
    month: number,
    timezoneOffsetMinutes: number,
  ): Promise<CalendarResponse> {
    const startLocal = new Date(Date.UTC(year, month - 1, 1));
    const endLocal = new Date(Date.UTC(year, month, 1));
    const offsetMs = timezoneOffsetMinutes * 60_000;
    const window: UtcWindow = {
      startUtc: new Date(startLocal.getTime() + offsetMs),
      endUtc: new Date(endLocal.getTime() + offsetMs),
    };
    const records = await this.repository.findForUserInWindow(userId, window);
    const grouped = new Map<string, MoodRecordEntity[]>();
    for (const record of records) {
      const date = formatLocalDateKey(record.occurredAtUtc, timezoneOffsetMinutes);
      grouped.set(date, [...(grouped.get(date) ?? []), record]);
    }
    const days = [...grouped].map(([date, items]) => ({
      date,
      recordCount: items.length,
      averageTorque: Math.round(items.reduce((sum, item) => sum + item.torque, 0) / items.length),
    }));
    return { year, month, days, serverTime: new Date().toISOString() };
  }
}
