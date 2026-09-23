import { Module, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { resolveDatabasePath, type AppEnvironment } from '../config/app-config.js';
import { MoodRecordEntity } from './entities/mood-record.entity.js';
import { MutationReceiptEntity } from './entities/mutation-receipt.entity.js';
import { UserEntity } from './entities/user.entity.js';
import { InitialSchema1700000000000 } from './migrations/1700000000000-initial-schema.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnvironment, true>) => ({
        type: 'better-sqlite3' as const,
        database: resolveDatabasePath(config.get('DATABASE_PATH', { infer: true })),
        entities: [UserEntity, MoodRecordEntity, MutationReceiptEntity],
        migrations: [InitialSchema1700000000000],
        migrationsRun: true,
        synchronize: false,
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.dataSource.query('PRAGMA journal_mode=WAL');
    await this.dataSource.query('PRAGMA foreign_keys=ON');
    await this.dataSource.query('PRAGMA busy_timeout=5000');
  }
}
