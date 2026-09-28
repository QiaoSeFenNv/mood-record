import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
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
    // 客户端必须传发生时间（带时区偏移的 ISO 字符串）。仅允许不超过“当前 + 5 分钟”
    // 且不早于一年前，以容纳轻微时钟漂移、同时拒绝明显篡改或穿越的提交。
    const occurredAtUtc = new Date(input.occurredAt);
    if (Number.isNaN(occurredAtUtc.getTime())) {
      throw new BadRequestException({
        code: 'INVALID_OCCURRED_AT',
        message: '发生时间格式不正确，请重新滑动记录',
      });
    }
    const maxFutureSkewMs = 5 * 60_000;
    const maxPastSkewMs = 365 * 24 * 60 * 60_000;
    if (
      occurredAtUtc.getTime() > now.getTime() + maxFutureSkewMs ||
      occurredAtUtc.getTime() < now.getTime() - maxPastSkewMs
    ) {
      throw new BadRequestException({
        code: 'OCCURRED_AT_OUT_OF_RANGE',
        message: '发生时间距离现在过远，请使用当前时间记录',
      });
    }
    const moodBand = torqueToMoodBand(input.torque);
    const result = await this.repository.createIdempotently(
      user.id,
      input.torque,
      moodBand,
      input.timezoneOffsetMinutes,
      input.clientMutationId,
      occurredAtUtc,
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
