import { createHash, randomUUID } from 'node:crypto';

import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';

import type { ContextRequest } from './request-context.js';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(request: ContextRequest, response: Response, next: NextFunction): void {
    const started = Date.now();
    request.requestId = randomUUID();
    response.setHeader('X-Request-Id', request.requestId);
    response.on('finish', () => {
      const userHash = request.currentUser
        ? createHash('sha256').update(request.currentUser.id).digest('hex').slice(0, 12)
        : undefined;
      // 不记录 query/body/header、令牌或扭矩；URL 只取路由路径。
      this.logger.log(
        JSON.stringify({
          requestId: request.requestId,
          route: request.path,
          method: request.method,
          status: response.statusCode,
          durationMs: Date.now() - started,
          ...(userHash ? { userHash } : {}),
        }),
      );
    });
    next();
  }
}
