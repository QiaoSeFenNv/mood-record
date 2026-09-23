import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

import type { ContextRequest } from './request-context.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<ContextRequest>();
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const payload = typeof body === 'object' && body !== null ? body : {};
    const code = 'code' in payload && typeof payload.code === 'string' ? payload.code : 'API_ERROR';
    const message =
      status >= 500
        ? '服务暂时不可用，请稍后重试'
        : 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : '请求未能完成';
    const details = 'details' in payload ? payload.details : undefined;

    response.status(status).json({
      code,
      message,
      requestId: request.requestId,
      ...(details ? { details } : {}),
    });
  }
}
