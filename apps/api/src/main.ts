import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module.js';
import type { AppEnvironment } from './config/app-config.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: false,
  });
  const config = app.get<ConfigService<AppEnvironment, true>>(ConfigService);
  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }).split(',') });
  await app.listen(config.get('PORT', { infer: true }), config.get('HOST', { infer: true }));
}

void bootstrap();
