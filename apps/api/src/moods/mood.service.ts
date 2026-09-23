import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  type CreateMoodRequest,
  type CreateMoodResponse,
  type MoodRecord,
  type Resonance,
  type TodayResponse,
} from '@mood-record/contracts';
import {
  estimateResonance,
  localDayUtcWindow,
  moodBandName,
  TimeRange,
  torqueToMoodBand,
  type MoodBand,
} from '@mood-record/domain';

import type { CurrentUser } from '../common/request-context.js';
import type { MoodRecordEntity } from '../database/entities/mood-record.entity.js';
import { MoodRepository } from '../repositories/mood.repository.js';

export function toMoodRecord(record: MoodRecordEntity): MoodRecord {
  return {
    id: record.id,
    torque: record.torque,
    moodBand: record.moodBand,
    moodName: moodBandName(record.moodBand),
    occurredAtUtc: record.occurredAtUtc.toISOString(),
    timezoneOffsetMinutes: record.timezoneOffsetMinutes,
  };
}

@Injectable()
export class MoodService {
  constructor(@Inject(MoodRepository) private readonly repository: MoodRepository) {}

  async create(user: CurrentUser, input: CreateMoodRequest): Promise<CreateMoodResponse> {
    const now = new Date();
    const moodBand = torqueToMoodBand(input.torque);
    const result = await this.repository.createIdempotently(
      user.id,
      input.torque,
      moodBand,
      input.timezoneOffsetMinutes,
      input.clientMutationId,
      now,
    );
    if (result.state === 'REVERSED') {
      throw new ConflictException({
        code: 'MUTATION_REVERSED',
        message: '这次记录已撤销，请重新滑动记录',
      });
    }
    const resonance = await this.resonance(
      user,
      result.record.moodBand,
      input.timezoneOffsetMinutes,
      now,
    );
    return {
      record: toMoodRecord(result.record),
      resonance,
      serverTime: now.toISOString(),
      idempotentReplay: result.state === 'REPLAYED',
    };
  }

  async today(user: CurrentUser, timezoneOffsetMinutes: number): Promise<TodayResponse> {
    const now = new Date();
    const window = localDayUtcWindow(now, timezoneOffsetMinutes);
    const records = await this.repository.findForUserInWindow(user.id, window);
    return {
      records: records.map(toMoodRecord),
      windowStartUtc: window.startUtc.toISOString(),
      windowEndUtc: window.endUtc.toISOString(),
      serverTime: now.toISOString(),
    };
  }

  async resonance(
    user: CurrentUser,
    moodBand: MoodBand,
    timezoneOffsetMinutes: number,
    now = new Date(),
  ): Promise<Resonance> {
    const window = localDayUtcWindow(now, timezoneOffsetMinutes);
    const baseCount = await this.repository.countDistinctOthers(
      user.id,
      user.dataEnvironment,
      moodBand,
      window,
    );
    return {
      ...estimateResonance(baseCount),
      range: TimeRange.TODAY,
      windowStartUtc: window.startUtc.toISOString(),
      windowEndUtc: window.endUtc.toISOString(),
    };
  }

  delete(user: CurrentUser, id: string): Promise<boolean> {
    return this.repository.deleteForUser(user.id, id);
  }
}
