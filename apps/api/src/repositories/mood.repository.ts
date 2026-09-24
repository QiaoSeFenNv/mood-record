import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { MoodBand, type UtcWindow } from '@mood-record/domain';
import { DataSource, type Repository } from 'typeorm';

import { MoodRecordEntity } from '../database/entities/mood-record.entity.js';
import { MutationReceiptEntity } from '../database/entities/mutation-receipt.entity.js';
import { UserEntity } from '../database/entities/user.entity.js';

// 留出每小时清理任务的最大调度间隔，避免正常运行时回执超过 24 小时。
const RECEIPT_TTL_MS = 23 * 60 * 60 * 1000;

export type CreateResult =
  | { state: 'CREATED' | 'REPLAYED'; record: MoodRecordEntity }
  | { state: 'REVERSED' };

@Injectable()
export class MoodRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(MoodRecordEntity)
    private readonly records: Repository<MoodRecordEntity>,
  ) {}

  /** 在一个 SQLite 事务中保存记录和幂等回执；回执已撤销时绝不复活。 */
  async createIdempotently(
    userId: string,
    torque: number,
    moodBand: MoodBand,
    timezoneOffsetMinutes: number,
    clientMutationId: string,
    occurredAtUtc: Date,
  ): Promise<CreateResult> {
    return this.dataSource.transaction(async (manager) => {
      const receipts = manager.getRepository(MutationReceiptEntity);
      const records = manager.getRepository(MoodRecordEntity);
      const existing = await receipts.findOneBy({ userId, clientMutationId });
      if (existing?.state === 'REVERSED') return { state: 'REVERSED' };
      if (existing?.recordId) {
        const record = await records.findOneBy({ id: existing.recordId, userId });
        if (record) return { state: 'REPLAYED', record };
        return { state: 'REVERSED' };
      }

      const record = records.create({
        id: randomUUID(),
        userId,
        torque,
        moodBand,
        occurredAtUtc,
        timezoneOffsetMinutes,
        clientMutationId,
      });
      await records.save(record);
      await receipts.save(
        receipts.create({
          id: randomUUID(),
          userId,
          clientMutationId,
          recordId: record.id,
          state: 'ACTIVE',
          expiresAtUtc: new Date(occurredAtUtc.getTime() + RECEIPT_TTL_MS),
        }),
      );
      return { state: 'CREATED', record };
    });
  }

  async findForUserInWindow(userId: string, window: UtcWindow): Promise<MoodRecordEntity[]> {
    return this.records
      .createQueryBuilder('record')
      .where('record.user_id = :userId', { userId })
      .andWhere('record.occurred_at_utc >= :start', { start: window.startUtc })
      .andWhere('record.occurred_at_utc < :end', { end: window.endUtc })
      .orderBy('record.occurred_at_utc', 'ASC')
      .addOrderBy('record.id', 'ASC')
      .getMany();
  }

  async countDistinctOthers(
    userId: string,
    dataEnvironment: string,
    moodBand: MoodBand,
    window: UtcWindow,
  ): Promise<number> {
    const result = await this.records
      .createQueryBuilder('record')
      .innerJoin(UserEntity, 'person', 'person.id = record.user_id')
      .select('COUNT(DISTINCT record.user_id)', 'count')
      .where('record.mood_band = :moodBand', { moodBand })
      .andWhere('record.occurred_at_utc >= :start', { start: window.startUtc })
      .andWhere('record.occurred_at_utc < :end', { end: window.endUtc })
      .andWhere('record.user_id != :userId', { userId })
      .andWhere('person.data_environment = :dataEnvironment', { dataEnvironment })
      .getRawOne<{ count: number | string }>();
    return Number(result?.count ?? 0);
  }

  /** 仅允许所有者删除；重复 DELETE 返回成功，回执保留反向状态防止重试复活。 */
  async deleteForUser(userId: string, recordId: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const records = manager.getRepository(MoodRecordEntity);
      const receipts = manager.getRepository(MutationReceiptEntity);
      const record = await records.findOneBy({ id: recordId, userId });
      if (!record) return false;
      await receipts.update(
        { userId, clientMutationId: record.clientMutationId },
        {
          state: 'REVERSED',
          recordId: null,
        },
      );
      await records.delete({ id: recordId, userId });
      return true;
    });
  }

  findAllForUser(userId: string): Promise<MoodRecordEntity[]> {
    return this.records.find({
      where: { userId },
      order: { occurredAtUtc: 'ASC', id: 'ASC' },
    });
  }

  async clearForUser(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(MutationReceiptEntity, { userId });
      await manager.delete(MoodRecordEntity, { userId });
    });
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(MutationReceiptEntity, { userId });
      await manager.delete(MoodRecordEntity, { userId });
      await manager.delete(UserEntity, { id: userId });
    });
  }

  async pruneExpiredReceipts(nowUtc: Date): Promise<number> {
    const result = await this.dataSource
      .getRepository(MutationReceiptEntity)
      .createQueryBuilder()
      .delete()
      .where('expires_at_utc < :now', { now: nowUtc })
      .execute();
    return result.affected ?? 0;
  }
}
