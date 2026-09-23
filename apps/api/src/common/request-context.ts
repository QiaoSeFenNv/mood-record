import type { DataEnvironment } from '@mood-record/contracts';
import type { Request } from 'express';

export interface CurrentUser {
  id: string;
  dataEnvironment: DataEnvironment;
}

export interface ContextRequest extends Request {
  requestId: string;
  currentUser?: CurrentUser;
}
