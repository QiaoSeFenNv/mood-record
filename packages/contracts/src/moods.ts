import { MoodBand, TimeRange } from '@mood-record/domain';
import { z } from 'zod';

import { serverTimeSchema, timezoneOffsetSchema } from './common.js';

export const moodBandSchema = z.nativeEnum(MoodBand);
export const timeRangeSchema = z.nativeEnum(TimeRange);

export const createMoodRequestSchema = z.object({
  torque: z.number().int().min(-100).max(100),
  timezoneOffsetMinutes: timezoneOffsetSchema,
  clientMutationId: z.uuid(),
});
export type CreateMoodRequest = z.infer<typeof createMoodRequestSchema>;

export const moodRecordSchema = z.object({
  id: z.uuid(),
  torque: z.number().int().min(-100).max(100),
  moodBand: moodBandSchema,
  moodName: z.string().min(1),
  occurredAtUtc: z.iso.datetime({ offset: true }),
  timezoneOffsetMinutes: timezoneOffsetSchema,
});
export type MoodRecord = z.infer<typeof moodRecordSchema>;

export const resonanceSchema = z.object({
  baseCount: z.number().int().nonnegative(),
  coefficient: z.number().min(1).max(10),
  displayCount: z.number().int().nonnegative().nullable(),
  estimated: z.literal(true),
  range: timeRangeSchema,
  windowStartUtc: z.iso.datetime({ offset: true }),
  windowEndUtc: z.iso.datetime({ offset: true }),
});
export type Resonance = z.infer<typeof resonanceSchema>;

export const createMoodResponseSchema = z.object({
  record: moodRecordSchema,
  resonance: resonanceSchema,
  serverTime: serverTimeSchema,
  idempotentReplay: z.boolean(),
});
export type CreateMoodResponse = z.infer<typeof createMoodResponseSchema>;

export const todayQuerySchema = z.object({
  timezoneOffsetMinutes: z.coerce.number().int().min(-840).max(840),
});

export const todayResponseSchema = z.object({
  records: z.array(moodRecordSchema),
  windowStartUtc: z.iso.datetime({ offset: true }),
  windowEndUtc: z.iso.datetime({ offset: true }),
  serverTime: serverTimeSchema,
});
export type TodayResponse = z.infer<typeof todayResponseSchema>;

export const resonanceQuerySchema = z.object({
  moodBand: moodBandSchema,
  range: timeRangeSchema,
  timezoneOffsetMinutes: z.coerce.number().int().min(-840).max(840),
});
