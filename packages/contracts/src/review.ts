import { z } from 'zod';

import { moodBandSchema } from './moods.js';
import { serverTimeSchema, timezoneOffsetSchema } from './common.js';

export const weeklyQuerySchema = z.object({
  timezoneOffsetMinutes: z.coerce.number().int().min(-840).max(840),
  anchorDate: z.iso.date().optional(),
});

export const dailyReviewSchema = z.object({
  date: z.iso.date(),
  recordCount: z.number().int().nonnegative(),
  averageTorque: z.number().min(-100).max(100).nullable(),
  moodBands: z.array(moodBandSchema),
});

export const weeklyResponseSchema = z.object({
  days: z.array(dailyReviewSchema).length(7),
  insights: z.array(z.string()),
  serverTime: serverTimeSchema,
});
export type WeeklyResponse = z.infer<typeof weeklyResponseSchema>;

export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  timezoneOffsetMinutes: z.coerce.number().int().min(-840).max(840),
});

export const calendarDaySchema = z.object({
  date: z.iso.date(),
  recordCount: z.number().int().positive(),
  averageTorque: z.number().min(-100).max(100),
});

export const calendarResponseSchema = z.object({
  year: z.number().int(),
  month: z.number().int(),
  days: z.array(calendarDaySchema),
  serverTime: serverTimeSchema,
});
export type CalendarResponse = z.infer<typeof calendarResponseSchema>;

export const settingsSchema = z.object({
  vibrationEnabled: z.boolean(),
  reducedMotion: z.boolean(),
  timezoneOffsetMinutes: timezoneOffsetSchema,
});
export type UserSettings = z.infer<typeof settingsSchema>;
