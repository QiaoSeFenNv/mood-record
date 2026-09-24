import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import UndoBar from './UndoBar.vue';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('UndoBar', () => {
  it('offers one undo during five seconds', async () => {
    const wrapper = mount(UndoBar, { props: { recordId: 'record-1' } });
    expect(wrapper.text()).toContain('5 秒内可撤销');
    await vi.advanceTimersByTimeAsync(4000);
    expect(wrapper.text()).toContain('1 秒内可撤销');

    await wrapper.find('.undo-button').trigger('tap');
    expect(wrapper.emitted('undo')).toEqual([['record-1']]);
    expect(wrapper.find('.undo-bar').exists()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('expires, resets for another record, and clears its timer on unmount', async () => {
    const wrapper = mount(UndoBar, { props: { recordId: 'record-1' } });
    await vi.advanceTimersByTimeAsync(5000);
    expect(wrapper.find('.undo-bar').exists()).toBe(false);
    expect(wrapper.emitted('undo')).toBeUndefined();

    await wrapper.setProps({ recordId: 'record-2' });
    await nextTick();
    expect(wrapper.text()).toContain('5 秒内可撤销');
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
