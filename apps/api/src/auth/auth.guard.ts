import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { ContextRequest } from '../common/request-context.js';
import { AUTH_PROVIDER, type AuthProviderAdapter } from './auth-provider.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AUTH_PROVIDER) private readonly auth: AuthProviderAdapter) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ContextRequest>();
    const authorization = request.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('请先登录测试身份');
    }
    const identity = await this.auth.verify(authorization.slice(7));
    request.currentUser = { id: identity.userId, dataEnvironment: identity.dataEnvironment };
    return true;
  }
}
