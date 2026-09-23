import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { RepositoryModule } from '../repositories/repository.module.js';
import { MoodController, ResonanceController } from './mood.controller.js';
import { MoodService } from './mood.service.js';

@Module({
  imports: [AuthModule, RepositoryModule],
  providers: [MoodService],
  controllers: [MoodController, ResonanceController],
  exports: [MoodService],
})
export class MoodModule {}
