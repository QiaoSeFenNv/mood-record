import { z } from 'zod';

export const dataEnvironmentSchema = z.enum(['TEST', 'LIVE']);
export type DataEnvironment = z.infer<typeof dataEnvironmentSchema>;

export const authProviderSchema = z.enum(['DEV', 'WECHAT']);
export type AuthProvider = z.infer<typeof authProviderSchema>;

export const mutationStateSchema = z.enum(['ACTIVE', 'REVERSED']);
export type MutationState = z.infer<typeof mutationStateSchema>;

export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  requestId: z.string().min(1),
  details: z.record(z.string(), z.array(z.string())).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const serverTimeSchema = z.iso.datetime({ offset: true });

export const timezoneOffsetSchema = z.number().int().min(-840).max(840);
