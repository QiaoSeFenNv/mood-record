import { Body, Controller, Inject, Post } from '@nestjs/common';
import {
  devSessionRequestSchema,
  type DevSessionRequest,
  type SessionResponse,
} from '@mood-record/contracts';

import { ZodPipe } from '../common/zod.pipe.js';
import { AUTH_PROVIDER, type AuthProviderAdapter } from './auth-provider.js';

@Controller('auth/dev')
export class AuthController {
  constructor(@Inject(AUTH_PROVIDER) private readonly auth: AuthProviderAdapter) {}

  @Post('session')
  async createSession(
    @Body(new ZodPipe(devSessionRequestSchema)) input: DevSessionRequest,
  ): Promise<SessionResponse> {
    const session = await this.auth.issueDevelopmentSession(input.testUserCode);
    return {
      accessToken: session.accessToken,
      expiresInSeconds: session.expiresInSeconds,
      user: {
        id: session.identity.userId,
        displayCode: input.testUserCode,
        dataEnvironment: session.identity.dataEnvironment,
      },
      serverTime: new Date().toISOString(),
    };
  }
}
