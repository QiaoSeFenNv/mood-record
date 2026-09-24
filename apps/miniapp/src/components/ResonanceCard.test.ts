import { mount } from '@vue/test-utils';
import { TimeRange } from '@mood-record/domain';
import type { Resonance } from '@mood-record/contracts';
import { describe, expect, it } from 'vitest';

import ResonanceCard from './ResonanceCard.vue';

const base: Resonance = {
  baseCount: 0,
  coefficient: 1,
  displayCount: null,
  estimated: true,
  range: TimeRange.TODAY,
  windowStartUtc: '2026-09-22T16:00:00.000Z',
  windowEndUtc: '2026-09-23T16:00:00.000Z',
};

describe('ResonanceCard', () => {
  it('never invents people when the base count is zero', () => {
    const wrapper = mount(ResonanceCard, { props: { resonance: base } });
    expect(wrapper.text()).toContain('今天还没有其他人');
    expect(wrapper.text()).not.toContain('约 0 人');
    expect(wrapper.text()).toContain('测试环境');
  });

  it('discloses the estimate when there are matching users', () => {
    const wrapper = mount(ResonanceCard, {
      props: {
        resonance: { ...base, baseCount: 1, coefficient: 10, displayCount: 10 },
        moodName: '平静',
      },
    });
    expect(wrapper.text()).toContain('约 10 人，也记录了平静');
    expect(wrapper.text()).toContain('基于匿名活跃趋势估算');
  });
});
