import { mount } from '@vue/test-utils';
import type { MoodRecord } from '@mood-record/contracts';
import { MoodBand } from '@mood-record/domain';
import { describe, expect, it } from 'vitest';

import MoodTree from './MoodTree.vue';

const records: MoodRecord[] = [
  {
    id: '65d1967a-f053-4ee2-bde9-32969ef54553',
    torque: -80,
    moodBand: MoodBand.VERY_LOW,
    moodName: '很低落',
    occurredAtUtc: '2026-09-23T01:00:00.000Z',
    timezoneOffsetMinutes: -480,
  },
  {
    id: '3059b20c-c35e-4094-84e0-083140371d21',
    torque: 0,
    moodBand: MoodBand.CALM,
    moodName: '平静',
    occurredAtUtc: '2026-09-23T02:00:00.000Z',
    timezoneOffsetMinutes: -480,
  },
  {
    id: 'bcb1ca89-18eb-442d-9fb4-0b9a6cb252e1',
    torque: 75,
    moodBand: MoodBand.VERY_HAPPY,
    moodName: '很愉快',
    occurredAtUtc: '2026-09-23T03:00:00.000Z',
    timezoneOffsetMinutes: -480,
  },
];

describe('MoodTree', () => {
  it('keeps different mood traces together and rebuilds after a deletion', async () => {
    const wrapper = mount(MoodTree, { props: { records } });
    expect(wrapper.findAll('.trace:not(.preview)')).toHaveLength(3);
    expect(wrapper.find('.drop').exists()).toBe(true);
    expect(wrapper.find('.light').exists()).toBe(true);
    expect(wrapper.find('.bloom').exists()).toBe(true);

    await wrapper.setProps({ records: [records[0]!, records[2]!] });
    expect(wrapper.find('.light').exists()).toBe(false);
    expect(wrapper.find('.drop').exists()).toBe(true);
    expect(wrapper.find('.bloom').exists()).toBe(true);
  });

  it('previews without persisting a trace and supports reduced motion', async () => {
    const wrapper = mount(MoodTree, {
      props: { records: [], previewTorque: -30, reducedMotion: true },
    });
    expect(wrapper.find('.scene').classes()).toContain('still');
    expect(wrapper.find('.preview.dew').exists()).toBe(true);
    expect(wrapper.findAll('.trace:not(.preview)')).toHaveLength(0);

    await wrapper.setProps({ previewTorque: null });
    expect(wrapper.find('.preview').exists()).toBe(false);
  });

  it('groups repeated mood traces with an exact count and reports an image load failure', async () => {
    const repeated = Array.from({ length: 12 }, (_, index) => ({
      ...records[0]!,
      id: `trace-${index}`,
    }));
    const wrapper = mount(MoodTree, { props: { records: repeated } });
    expect(wrapper.findAll('.trace:not(.preview)')).toHaveLength(1);
    expect(wrapper.find('.trace-count').text()).toBe('12');

    await wrapper.find('.plant').trigger('error');
    expect(wrapper.find('[role="status"]').text()).toContain('插画暂时无法显示');
  });
});
