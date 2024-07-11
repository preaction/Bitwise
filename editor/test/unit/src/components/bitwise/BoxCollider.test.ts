
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { mount } from '@vue/test-utils';
import BoxColliderComponent from '../../../../../src/components/bitwise/BoxCollider.vue';

const onUpdate = jest.fn();
const defaultModelValue = {
  // Collider origin
  ox: 0, oy: 0, oz: 0,
  // Collider scale
  sx: 1, sy: 1, sz: 1,
  // Other
  trigger: 0,
};
let modelValue = { ...defaultModelValue };
beforeEach(() => {
  onUpdate.mockReset();
  modelValue = { ...defaultModelValue };
});

const testModelValue = {
  // Collider origin
  ox: 0.1, oy: 0.2, oz: 0.3,
  // Collider scale
  sx: 0.4, sy: 0.5, sz: 0.6,
  // Other
  trigger: 1,
};

describe('bitwise/BoxCollider.vue', () => {
  let wrapper = mount(BoxColliderComponent, {
    props: {
      modelValue,
      'onUpdate:modelValue': onUpdate,
    },
  });
  beforeEach(() => {
    wrapper = mount(BoxColliderComponent, {
      props: {
        modelValue,
        'onUpdate:modelValue': onUpdate,
      },
    });
  });

  describe('allows updating values', () => {
    for (const [key, newValue] of Object.entries(testModelValue)) {
      test(`can set value for field: ${key}`, async () => {
        const input = wrapper.find(`[name=${key}]`);
        expect(input.exists()).toBeTruthy();
        await input.setValue(newValue);
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onUpdate.mock.lastCall?.[0]).toMatchObject({ [key]: newValue });
      });
    }
  });

  describe('sets fields from modelValue', () => {
    for (const [key, value] of Object.entries(modelValue)) {
      test(`initial value is correct for field: ${key}`, async () => {
        const input = wrapper.vm.$el.querySelector(`[name=${key}]`);
        expect(input).toBeTruthy();
        if (input instanceof HTMLInputElement && input.type.match(/check/)) {
          expect(input.checked).toBe(!!value);
        }
        else {
          expect(input.value).toBe("" + value);
        }
      });
    }

    for (const [key, newValue] of Object.entries(testModelValue)) {
      test(`can update value for field: ${key}`, async () => {
        const newModelValue = {
          ...modelValue,
          [key]: newValue,
        };
        await wrapper.setProps({ modelValue: newModelValue });
        const input = wrapper.vm.$el.querySelector(`[name=${key}]`);
        expect(input).toBeTruthy();
        if (input instanceof HTMLInputElement && input.type.match(/check/)) {
          expect(input.checked).toBe(!!newValue);
        }
        else {
          expect(input.value).toBe("" + newValue);
        }
      });
    }
  });
});
