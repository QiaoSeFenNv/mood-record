import { flushPromises, shallowMount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import type { CreateMoodRequest, MoodRecord, Resonance } from '@mood-record/contracts';
import { MoodBand, TimeRange } from '@mood-record/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TodayPage from './index.vue';

const mockApi = vi.hoisted(() => ({
  today: vi.fn(),
  resonance: vi.fn(),
  createMood:
    vi.fn<(request: CreateMoodRequest) => Promise<{ record: MoodRecord; resonance: Resonance }>>(),
  deleteMood: vi.fn(),
}));
const lifecycle = vi.hoisted(() => ({
  show: null as (() => void) | null,
  hide: null as (() => void) | null,
}));

function commitTorque(wrapper: VueWrapper, torque: number): void {
  const component = wrapper.findComponent({ name: 'MoodTorque' });
  (component.vm as unknown as { $emit: (event: 'commit', value: number) => void }).$emit(
    'commit',
    torque,
  );
}

vi.mock('../../api/client', () => ({
  api: mockApi,
  ApiRequestError: class extends Error {},
}));
vi.mock('../../stores/session', () => ({
  useSessionStore: () => ({
    accessToken: 'test-token',
    displayCode: 'TEST_A',
    vibrationEnabled: true,
    reducedMotion: false,
  }),
}));
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void) => {
    lifecycle.show = callback;
    callback();
  },
  onHide: (callback: () => void) => {
    lifecycle.hide = callback;
  },
}));

const record: MoodRecord = {
  id: 'd39e909c-41b1-43ab-b8b0-dfd71ce74157',
  torque: -61,
  moodBand: MoodBand.VERY_LOW,
  moodName: '很低落',
  occurredAtUtc: '2026-09-23T06:00:00.000Z',
  timezoneOffsetMinutes: -480,
};
const resonance: Resonance = {
  baseCount: 0,
  coefficient: 1,
  displayCount: null,
  estimated: true,
  range: TimeRange.TODAY,
  windowStartUtc: '2026-09-22T16:00:00.000Z',
  windowEndUtc: '2026-09-23T16:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  lifecycle.show = null;
  lifecycle.hide = null;
  mockApi.today.mockResolvedValue({ records: [] });
  mockApi.resonance.mockResolvedValue(resonance);
});
afterEach(() => vi.useRealTimers());

describe('TodayPage save recovery', () => {
  it('loads resonance for an existing record on the first visit', async () => {
    mockApi.today.mockResolvedValue({ records: [record] });
    const wrapper = shallowMount(TodayPage);
    await flushPromises();
    expect(mockApi.resonance).toHaveBeenCalledWith(MoodBand.VERY_LOW, expect.any(Number));
    expect(wrapper.findComponent({ name: 'ResonanceCard' }).props('moodName')).toBe('很低落');
  });

  it('retries a failed save with the same mutation id and does not duplicate commits', async () => {
    mockApi.createMood
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ record, resonance });
    const wrapper = shallowMount(TodayPage);
    await flushPromises();

    commitTorque(wrapper, -61);
    commitTorque(wrapper, -61);
    await flushPromises();
    expect(mockApi.createMood).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('重试保存');

    mockApi.today.mockResolvedValue({ records: [record] });
    await wrapper.find('.status button.action').trigger('tap');
    await flushPromises();
    expect(mockApi.createMood).toHaveBeenCalledTimes(2);
    expect(mockApi.createMood.mock.calls[0]?.[0].clientMutationId).toBe(
      mockApi.createMood.mock.calls[1]?.[0].clientMutationId,
    );
    expect(wrapper.text()).not.toContain('重试保存');
    expect(wrapper.findComponent({ name: 'UndoBar' }).props('recordId')).toBe(record.id);
  });

  it('clears stale resonance when a new local day has no records', async () => {
    mockApi.today.mockResolvedValue({ records: [record] });
    mockApi.createMood.mockResolvedValue({ record, resonance });
    const wrapper = shallowMount(TodayPage);
    await flushPromises();
    commitTorque(wrapper, -61);
    await flushPromises();
    expect(wrapper.findComponent({ name: 'ResonanceCard' }).props('resonance')).toEqual(resonance);

    mockApi.today.mockResolvedValue({ records: [] });
    lifecycle.show?.();
    await flushPromises();
    expect(wrapper.findComponent({ name: 'ResonanceCard' }).props('resonance')).toBeNull();
  });

  it('uses the latest local-day mood when refreshing resonance', async () => {
    mockApi.today.mockResolvedValue({ records: [record] });
    mockApi.createMood.mockResolvedValue({ record, resonance });
    const wrapper = shallowMount(TodayPage);
    await flushPromises();
    commitTorque(wrapper, -61);
    await flushPromises();

    const nextDayRecord: MoodRecord = {
      ...record,
      id: '86c11acf-59f1-42fb-aa5d-4cb0a0107eef',
      torque: 75,
      moodBand: MoodBand.VERY_HAPPY,
      moodName: '很愉快',
      occurredAtUtc: '2026-09-24T03:00:00.000Z',
    };
    mockApi.today.mockResolvedValue({ records: [nextDayRecord] });
    lifecycle.show?.();
    await flushPromises();
    expect(mockApi.resonance).toHaveBeenLastCalledWith(MoodBand.VERY_HAPPY, expect.any(Number));
    expect(wrapper.findComponent({ name: 'ResonanceCard' }).props('moodName')).toBe('很愉快');
  });

  it('updates the date label and clears old selection when shown on a new day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T04:00:00.000Z'));
    mockApi.today.mockResolvedValue({ records: [record] });
    const wrapper = shallowMount(TodayPage);
    await flushPromises();
    expect(wrapper.text()).toContain('9月23日');
    const timeline = wrapper.findComponent({ name: 'DayTimeline' });
    (timeline.vm as unknown as { $emit: (event: 'select', value: MoodRecord) => void }).$emit(
      'select',
      record,
    );
    await flushPromises();
    expect(wrapper.find('.selection').exists()).toBe(true);

    vi.setSystemTime(new Date('2026-09-24T04:00:00.000Z'));
    mockApi.today.mockResolvedValue({ records: [] });
    lifecycle.show?.();
    await flushPromises();
    expect(wrapper.text()).toContain('9月24日');
    expect(wrapper.findComponent({ name: 'MoodTree' }).props('records')).toEqual([]);
    expect(wrapper.find('.selection').exists()).toBe(false);
  });
});
