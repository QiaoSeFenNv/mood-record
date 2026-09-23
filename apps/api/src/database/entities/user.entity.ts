import type { DataEnvironment, AuthProvider } from '@mood-record/contracts';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  /** 内部匿名用户 UUID。 */
  @PrimaryColumn({ type: 'text' })
  id!: string;

  /** 身份提供方：DEV=本地测试，WECHAT=微信。 */
  @Column({ name: 'auth_provider', type: 'text' })
  authProvider!: AuthProvider;

  /** 外部身份加盐后的一次摘要，不存储原始标识。 */
  @Column({ name: 'provider_subject_hash', type: 'text', unique: true })
  providerSubjectHash!: string;

  /** 数据环境：TEST=测试数据，LIVE=正式数据。 */
  @Column({ name: 'data_environment', type: 'text' })
  dataEnvironment!: DataEnvironment;

  /** 用户创建的 UTC 时间。 */
  @CreateDateColumn({ name: 'created_at_utc', type: 'datetime' })
  createdAtUtc!: Date;
}
