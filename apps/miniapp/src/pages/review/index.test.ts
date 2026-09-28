import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReviewPage from './index.vue';

const mockApi = vi.hoisted(() => ({
  weekly: vi.fn(),
  calendar: vi.fn(),
}));
const lifecycle = vi.hoisted(() => ({
  show: null as (() => void) | null,
}));

vi.mock('../../api/client', () => ({ api: mockApi }));
vi.mock('../../stores/session', () => ({
  useSessionStore: () => ({
    accessToken: 'test-token',
    plant: 'leaf-tree',
  }),
}));
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void) => {
    lifecycle.show = callback;
  },
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
  vi.clearAllMocks();
  mockApi.weekly.mockResolvedValue({ days: [], insights: [] });
  mockApi.calendar.mockImplementation((year: number, month: number) =>
    Promise.resolve({ year, month, days: [] }),
  );
  lifecycle.show = null;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ReviewPage month refresh', () => {
  it('requests the current calendar month each time the page is shown', async () => {
    const wrapper = shallowMount(ReviewPage);

    lifecycle.show?.();
    await flushPromises();
    expect(mockApi.calendar).toHaveBeenLastCalledWith(2026, 9, expect.any(Number));

    vi.setSystemTime(new Date('2026-10-01T00:01:00.000Z'));
    lifecycle.show?.();
    await flushPromises();

    expect(mockApi.calendar).toHaveBeenLastCalledWith(2026, 10, expect.any(Number));
    expect(wrapper.text()).toContain('2026 年 10 月');
  });
});
