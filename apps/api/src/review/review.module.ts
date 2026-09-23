import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { RepositoryModule } from '../repositories/repository.module.js';
import { ReviewController } from './review.controller.js';
import { ReviewService } from './review.service.js';

@Module({
  imports: [AuthModule, RepositoryModule],
  providers: [ReviewService],
  controllers: [ReviewController],
})
export class ReviewModule {}
