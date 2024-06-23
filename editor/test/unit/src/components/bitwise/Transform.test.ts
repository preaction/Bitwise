
import { describe, expect, test, jest } from '@jest/globals';
import { mount } from '@vue/test-utils';
import TransformComponent from '../../../../../src/components/bitwise/Transform.vue';

describe('bitwise/Transform.vue', () => {
  test('allows editing position', async () => {
    const modelValue = { x: 0, y: 0, z: 0 };
    const onUpdate = jest.fn();
    const wrapper = mount(TransformComponent, {
      props: {
        modelValue,
        'onUpdate:modelValue': onUpdate,
      },
    });
    const newValue = 1;
    wrapper.get('[name=x]').setValue(newValue);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.lastCall?.[0]).toMatchObject({ x: "" + newValue });
  });

  test('updates fields from modelValue', async () => {
    const modelValue = { x: 0, y: 0, z: 0 };
    const wrapper = mount(TransformComponent, {
      props: {
        modelValue,
      },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.$el.querySelector('[name=x]').value).toBe("" + modelValue.x);
    const newModelValue = { ...modelValue, x: 1 };
    await wrapper.setProps({ modelValue: newModelValue });
    expect(wrapper.vm.$el.querySelector('[name=x]').value).toBe("" + newModelValue.x);
  });
});
