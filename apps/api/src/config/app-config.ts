import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_PATH: z.string().min(1).default('../../data/mood-record.sqlite3'),
  ENABLE_DEV_AUTH: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  JWT_SECRET: z.string().min(32).default('development-only-secret-change-me-00000000'),
  DEV_AUTH_PEPPER: z.string().min(8).default('development-pepper'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export type AppEnvironment = z.infer<typeof environmentSchema>;

export function validateEnvironment(values: Record<string, unknown>): AppEnvironment {
  const config = environmentSchema.parse(values);
  if (config.NODE_ENV === 'production' && config.ENABLE_DEV_AUTH) {
    throw new Error('生产环境禁止启用开发身份入口');
  }
  if (config.NODE_ENV === 'production') {
    throw new Error('正式微信认证尚未接入；生产环境必须拒绝启动');
  }
  return config;
}

export function resolveDatabasePath(configuredPath: string): string {
  if (configuredPath === ':memory:') return configuredPath;
  const databasePath = resolve(process.cwd(), configuredPath);
  mkdirSync(dirname(databasePath), { recursive: true });
  return databasePath;
}
