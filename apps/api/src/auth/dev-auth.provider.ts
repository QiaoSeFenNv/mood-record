import { createHash, randomUUID } from 'node:crypto';

import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { AppEnvironment } from '../config/app-config.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { AuthProviderAdapter, AuthenticatedIdentity } from './auth-provider.js';

const SESSION_SECONDS = 60 * 60 * 12;

@Injectable()
export class DevAuthProvider implements AuthProviderAdapter {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<AppEnvironment, true>,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(UserRepository) private readonly users: UserRepository,
  ) {}

  async issueDevelopmentSession(testUserCode: string): Promise<{
    accessToken: string;
    identity: AuthenticatedIdentity;
    expiresInSeconds: number;
  }> {
    if (
      this.config.get('NODE_ENV', { infer: true }) !== 'development' ||
      !this.config.get('ENABLE_DEV_AUTH', { infer: true })
    ) {
      throw new ForbiddenException('开发身份入口仅限本地开发环境');
    }
    const subjectHash = createHash('sha256')
      .update(`DEV:${testUserCode}:${this.config.get('DEV_AUTH_PEPPER', { infer: true })}`)
      .digest('hex');
    const user = await this.users.findOrCreateDevUser(randomUUID(), subjectHash);
    const identity = { userId: user.id, dataEnvironment: 'TEST' as const };
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      env: identity.dataEnvironment,
      provider: 'DEV',
      nonce: randomUUID(),
    });
    return { accessToken, identity, expiresInSeconds: SESSION_SECONDS };
  }

  async verify(token: string): Promise<AuthenticatedIdentity> {
    try {
      const claims: unknown = await this.jwtService.verifyAsync(token);
      if (
        typeof claims !== 'object' ||
        claims === null ||
        !('sub' in claims) ||
        typeof claims.sub !== 'string' ||
        !('provider' in claims) ||
        claims.provider !== 'DEV' ||
        !('env' in claims) ||
        claims.env !== 'TEST' ||
        this.config.get('NODE_ENV', { infer: true }) !== 'development' ||
        !this.config.get('ENABLE_DEV_AUTH', { infer: true })
      ) {
        throw new UnauthorizedException();
      }
      const user = await this.users.findById(claims.sub);
      if (!user || user.dataEnvironment !== 'TEST' || user.authProvider !== 'DEV') {
        throw new UnauthorizedException();
      }
      return { userId: user.id, dataEnvironment: user.dataEnvironment };
    } catch {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }
  }

  revokeUser(): void {
    // 注销物理删除用户；每次验证都查询用户，旧令牌立即失效。
  }
}
