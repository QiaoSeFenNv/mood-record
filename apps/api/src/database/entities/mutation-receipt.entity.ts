import type { MutationState } from '@mood-record/contracts';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'mutation_receipts' })
@Index('uq_mutation_receipts_user_mutation', ['userId', 'clientMutationId'], { unique: true })
@Index('idx_mutation_receipts_expires', ['expiresAtUtc'])
export class MutationReceiptEntity {
  /** 幂等回执 UUID。 */
  @PrimaryColumn({ type: 'text' })
  id!: string;

  /** 所属匿名用户 UUID。 */
  @Column({ name: 'user_id', type: 'text' })
  userId!: string;

  /** 客户端幂等 UUID。 */
  @Column({ name: 'client_mutation_id', type: 'text' })
  clientMutationId!: string;

  /** 活跃记录 UUID；撤销后为空。 */
  @Column({ name: 'record_id', type: 'text', nullable: true })
  recordId!: string | null;

  /** ACTIVE=有效，REVERSED=已撤销。 */
  @Column({ type: 'text' })
  state!: MutationState;

  /** 回执过期 UTC 时间。 */
  @Column({ name: 'expires_at_utc', type: 'datetime' })
  expiresAtUtc!: Date;
}
