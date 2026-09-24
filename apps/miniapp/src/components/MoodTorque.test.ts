import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MoodTorque from './MoodTorque.vue';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MoodTorque', () => {
  it.each([
    [-100, '很低落'],
    [-60, '有点低落'],
    [0, '平静'],
    [61, '很愉快'],
    [100, '很愉快'],
  ])('previews %i and commits only after confirmation', async (torque, moodName) => {
    const wrapper = mount(MoodTorque);
    const slider = wrapper.find('slider');

    await slider.trigger('changing', { detail: { value: torque } });
    expect(wrapper.text()).toContain(moodName);
    expect(wrapper.emitted('preview')).toEqual([[torque]]);
    expect(wrapper.emitted('commit')).toBeUndefined();

    await slider.trigger('change', { detail: { value: torque } });
    await slider.trigger('change', { detail: { value: torque } });
    expect(wrapper.emitted('preview')).toEqual([[torque], [torque]]);
    expect(wrapper.emitted('commit')).toBeUndefined();
    await wrapper.find('.confirm').trigger('tap');
    await wrapper.find('.confirm').trigger('tap');
    expect(wrapper.emitted('commit')).toEqual([[torque]]);
  });

  it('does not commit when disabled or without an active gesture', async () => {
    const wrapper = mount(MoodTorque, { props: { disabled: true } });
    const slider = wrapper.find('slider');
    await slider.trigger('changing', { detail: { value: 35 } });
    await slider.trigger('change', { detail: { value: 35 } });
    expect(wrapper.emitted('commit')).toBeUndefined();

    await wrapper.setProps({ disabled: false });
    await slider.trigger('change', { detail: { value: 35 } });
    expect(wrapper.emitted('commit')).toBeUndefined();
  });

  it('vibrates only when enabled for a negative release', async () => {
    const vibrateShort = vi.fn();
    vi.stubGlobal('uni', { vibrateShort });
    const wrapper = mount(MoodTorque, { props: { vibrationEnabled: true } });
    const slider = wrapper.find('slider');
    await slider.trigger('changing', { detail: { value: -50 } });
    await slider.trigger('change', { detail: { value: -50 } });
    expect(vibrateShort).toHaveBeenCalledOnce();

    await wrapper.setProps({ vibrationEnabled: false });
    await slider.trigger('changing', { detail: { value: -70 } });
    await slider.trigger('change', { detail: { value: -70 } });
    expect(vibrateShort).toHaveBeenCalledOnce();
  });
});
