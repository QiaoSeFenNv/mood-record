import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MoodRecordEntity } from '../database/entities/mood-record.entity.js';
import { MutationReceiptEntity } from '../database/entities/mutation-receipt.entity.js';
import { UserEntity } from '../database/entities/user.entity.js';
import { MoodRepository } from './mood.repository.js';
import { UserRepository } from './user.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, MoodRecordEntity, MutationReceiptEntity])],
  providers: [UserRepository, MoodRepository],
  exports: [UserRepository, MoodRepository],
})
export class RepositoryModule {}
