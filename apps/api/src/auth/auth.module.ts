import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import type { AppEnvironment } from '../config/app-config.js';
import { RepositoryModule } from '../repositories/repository.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AUTH_PROVIDER } from './auth-provider.js';
import { DevAuthProvider } from './dev-auth.provider.js';

@Module({
  imports: [
    RepositoryModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnvironment, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [DevAuthProvider, { provide: AUTH_PROVIDER, useExisting: DevAuthProvider }, AuthGuard],
  exports: [AuthGuard, AUTH_PROVIDER],
})
export class AuthModule {}
