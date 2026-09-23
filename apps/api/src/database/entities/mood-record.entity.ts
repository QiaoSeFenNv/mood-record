import { MoodBand } from '@mood-record/domain';
import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'mood_records' })
@Index('idx_mood_records_user_occurred', ['userId', 'occurredAtUtc'])
@Index('idx_mood_records_band_occurred_user', ['moodBand', 'occurredAtUtc', 'userId'])
@Index('uq_mood_records_user_mutation', ['userId', 'clientMutationId'], { unique: true })
export class MoodRecordEntity {
  /** 心情记录 UUID。 */
  @PrimaryColumn({ type: 'text' })
  id!: string;

  /** 所属匿名用户 UUID。 */
  @Column({ name: 'user_id', type: 'text' })
  userId!: string;

  /** 连续心情扭矩，整数范围 -100 到 100。 */
  @Column({ type: 'integer' })
  torque!: number;

  /** 五段心情枚举。 */
  @Column({ name: 'mood_band', type: 'text' })
  moodBand!: MoodBand;

  /** 服务端确认的发生 UTC 时间。 */
  @Column({ name: 'occurred_at_utc', type: 'datetime' })
  occurredAtUtc!: Date;

  /** 记录时区偏移分钟，采用 UTC 减本地时间语义。 */
  @Column({ name: 'timezone_offset_minutes', type: 'integer' })
  timezoneOffsetMinutes!: number;

  /** 客户端幂等 UUID。 */
  @Column({ name: 'client_mutation_id', type: 'text' })
  clientMutationId!: string;

  /** 数据库创建 UTC 时间。 */
  @CreateDateColumn({ name: 'created_at_utc', type: 'datetime' })
  createdAtUtc!: Date;
}
