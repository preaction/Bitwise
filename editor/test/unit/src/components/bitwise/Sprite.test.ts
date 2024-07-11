
import { describe, expect, test, jest } from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import SpriteComponent from '../../../../../src/components/bitwise/Sprite.vue';
import type InputAsset from '../../../../../src/components/InputAsset.vue';

describe('bitwise/Sprite.vue', () => {
  test('allows dropping texture', async () => {
    const modelValue = { texture: { $asset: 'Texture', path: 'texture.png' } };
    const onUpdate = jest.fn();
    const wrapper = mount(SpriteComponent, {
      props: {
        modelValue,
        'onUpdate:modelValue': onUpdate,
      },
    });
    const newValue = { $asset: 'Texture', path: 'newTexture.png' };
    wrapper.getComponent<typeof InputAsset>('[name=texture]').vm.$emit('update:modelValue', newValue);
    await flushPromises();
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.lastCall?.[0]).toMatchObject({ texture: newValue });
  });

  test('updates fields from modelValue', async () => {
    const modelValue = { texture: { $asset: 'Texture', path: 'texture.png' } };
    const wrapper = mount(SpriteComponent, {
      props: {
        modelValue,
      },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.getComponent('[name=texture]').text()).toMatch(modelValue.texture.path);

    const newTexture = { $asset: 'Texture', path: 'newTexture.png' };
    await wrapper.setProps({ modelValue: { texture: newTexture } });
    expect(wrapper.getComponent('[name=texture]').text()).toMatch(newTexture.path);
  });
});
