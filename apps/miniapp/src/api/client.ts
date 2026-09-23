import { z, type ZodType } from 'zod';
import {
  apiErrorSchema,
  calendarResponseSchema,
  createMoodResponseSchema,
  sessionResponseSchema,
  todayResponseSchema,
  weeklyResponseSchema,
  resonanceSchema,
  type CreateMoodRequest,
} from '@mood-record/contracts';
import { TimeRange, type MoodBand } from '@mood-record/domain';

import { useSessionStore } from '../stores/session';

const configuredApiBase: unknown = import.meta.env.VITE_API_BASE_URL;
const API_BASE =
  typeof configuredApiBase === 'string' && configuredApiBase.length > 0
    ? configuredApiBase
    : 'http://127.0.0.1:3000/v1';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

/** 所有 JSON 响应在网络边界解码，页面不直接断言未知服务端数据。 */
async function requestJson<T>(
  path: string,
  schema: ZodType<T>,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  data?: unknown,
  authenticated = true,
): Promise<T> {
  const session = useSessionStore();
  const options: UniApp.RequestOptions = {
    url: `${API_BASE}${path}`,
    method,
    header: {
      'Content-Type': 'application/json',
      ...(authenticated && session.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
    },
    timeout: 10_000,
  };
  if (data !== undefined) {
    options.data = data as NonNullable<UniApp.RequestOptions['data']>;
  }
  const response = await uni.request(options);
  if (response.statusCode >= 400) {
    const parsed = apiErrorSchema.safeParse(response.data);
    throw new ApiRequestError(
      parsed.success ? parsed.data.message : '请求未能完成，请稍后再试',
      parsed.success ? parsed.data.code : 'NETWORK_ERROR',
    );
  }
  const result = schema.safeParse(response.data);
  if (!result.success) throw new ApiRequestError('服务端数据暂不可用', 'INVALID_RESPONSE');
  return result.data;
}

export const api = {
  devSession: (testUserCode: string) =>
    requestJson('/auth/dev/session', sessionResponseSchema, 'POST', { testUserCode }, false),
  createMood: (input: CreateMoodRequest) =>
    requestJson('/moods', createMoodResponseSchema, 'POST', input),
  today: (offset: number) =>
    requestJson(`/moods/today?timezoneOffsetMinutes=${offset}`, todayResponseSchema),
  resonance: (band: MoodBand, offset: number) =>
    requestJson(
      `/resonance?moodBand=${band}&range=${TimeRange.TODAY}&timezoneOffsetMinutes=${offset}`,
      resonanceSchema,
    ),
  weekly: (offset: number) =>
    requestJson(`/review/weekly?timezoneOffsetMinutes=${offset}`, weeklyResponseSchema),
  calendar: (year: number, month: number, offset: number) =>
    requestJson(
      `/review/calendar?year=${year}&month=${month}&timezoneOffsetMinutes=${offset}`,
      calendarResponseSchema,
    ),
  deleteMood: async (id: string) => {
    await requestJson(`/moods/${id}`, z.object({ deleted: z.boolean() }), 'DELETE');
  },
  clearMoods: async () => {
    await requestJson('/me/moods', z.object({ cleared: z.literal(true) }), 'DELETE');
  },
  deleteAccount: async () => {
    await requestJson('/me', z.object({ deleted: z.literal(true) }), 'DELETE');
  },
};

export function exportCsvUrl(): string {
  return `${API_BASE}/me/export.csv`;
}
