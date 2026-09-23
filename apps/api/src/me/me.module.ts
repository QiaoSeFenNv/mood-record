import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { RepositoryModule } from '../repositories/repository.module.js';
import { MeController } from './me.controller.js';
import { MeService } from './me.service.js';

@Module({
  imports: [AuthModule, RepositoryModule],
  providers: [MeService],
  controllers: [MeController],
})
export class MeModule {}
