import type { DataEnvironment } from '@mood-record/contracts';

export interface AuthenticatedIdentity {
  userId: string;
  dataEnvironment: DataEnvironment;
}

export interface AuthProviderAdapter {
  issueDevelopmentSession(testUserCode: string): Promise<{
    accessToken: string;
    identity: AuthenticatedIdentity;
    expiresInSeconds: number;
  }>;
  verify(token: string): Promise<AuthenticatedIdentity>;
  revokeUser(userId: string): void;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
