
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { mount } from '@vue/test-utils';
import RigidBodyComponent from '../../../../../src/components/bitwise/RigidBody.vue';

const onUpdate = jest.fn();
const defaultModelValue = {
  // Linear Velocity
  vx: 0, vy: 0, vz: 0,
  // Angular Velocity (Torque)
  rx: 0, ry: 0, rz: 0,
  // Linear factor
  lx: 1, ly: 1, lz: 1,
  // Angular factor
  ax: 1, ay: 1, az: 1,
  // Other
  mass: 0,
};
let modelValue = { ...defaultModelValue };
beforeEach(() => {
  onUpdate.mockReset();
  modelValue = { ...defaultModelValue };
});

const testModelValue = {
  // Linear Velocity
  vx: 1, vy: 1, vz: 1,
  // Angular Velocity (Torque)
  rx: 1, ry: 1, rz: 1,
  // Linear factor
  lx: 0, ly: 0, lz: 0,
  // Angular factor
  ax: 0, ay: 0, az: 0,
  // Other
  mass: 1,
};

describe('bitwise/RigidBody.vue', () => {
  let wrapper = mount(RigidBodyComponent, {
    props: {
      modelValue,
      'onUpdate:modelValue': onUpdate,
    },
  });
  beforeEach(() => {
    wrapper = mount(RigidBodyComponent, {
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
          expect(input.checked).toBe(!value);
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
          expect(input.checked).toBe(!newValue);
        }
        else {
          expect(input.value).toBe("" + newValue);
        }
      });
    }
  });
});
