import { z } from 'zod';

import { dataEnvironmentSchema, serverTimeSchema } from './common.js';

export const devSessionRequestSchema = z.object({
  testUserCode: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/, '测试用户代码只能包含字母、数字、下划线和连字符'),
});
export type DevSessionRequest = z.infer<typeof devSessionRequestSchema>;

export const sessionResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
  user: z.object({
    id: z.uuid(),
    displayCode: z.string().min(1),
    dataEnvironment: dataEnvironmentSchema,
  }),
  serverTime: serverTimeSchema,
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
