
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { mount, flushPromises, VueWrapper } from '@vue/test-utils';
import * as Vue from "vue";
import EntityPanel from '../../../../src/components/EntityPanel.vue';
import Tree from '../../../../src/components/Tree.vue';

import TransformEdit from '../../../../src/components/bitwise/Transform.vue';
import OrthographicCameraEdit from '../../../../src/components/bitwise/OrthographicCamera.vue';
import SpriteEdit from '../../../../src/components/bitwise/Sprite.vue';
import { Game } from '@fourstar/bitwise';
import type { EntityData, Scene } from '@fourstar/bitwise';

const systemForms = Vue.markRaw({});
const componentForms = Vue.markRaw({
  Transform: TransformEdit,
  OrthographicCamera: OrthographicCameraEdit,
  Sprite: SpriteEdit,
});
const provide = {
  systemForms,
  componentForms,
  openTab: () => (null),
  assets: [],
};

const modelValue: Array<EntityData> = [
  {
    $schema: '1',
    name: "Camera",
    type: "Camera",
    active: true,
    components: {
      Transform: {
        x: 0, y: 0, z: 2000,
        rx: 0, ry: 0, rz: 0,
        sx: 1, sy: 1, sz: 1,
      },
      OrthographicCamera: {
        frustum: 10,
        zoom: 1,
        near: 0,
        far: 2000
      }
    },
  },
];

let game: Game, scene: Scene;
beforeEach(async () => {
  game = new Game({});
  scene = game.addScene();
  await scene.thaw({
    $schema: '1',
    name: 'Scene Name',
    entities: modelValue,
    components: [],
    systems: [],
  });
});

describe('EntityPanel', () => {
  test('renders scene tree with entities', async () => {
    const wrapper = mount(EntityPanel, {
      props: {
        modelValue,
        scene,
      },
      global: { provide },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    const tree = wrapper.getComponent(Tree);
    expect(tree.get('[data-test=name]').text()).toBe(modelValue[0].name);
  });

  test('tree is updated when scene data changes', async () => {
    const wrapper = mount(EntityPanel, {
      attachTo: document.body,
      props: {
        modelValue: [],
        scene,
      },
      global: { provide, },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.findAllComponents(Tree)).toHaveLength(0);
    await wrapper.setProps({ modelValue });
    await wrapper.vm.$nextTick();

    const tree = wrapper.getComponent(Tree);
    expect(tree.get('[data-test=name]').text()).toBe(modelValue[0].name);
  });

  test('select entity by click', async () => {
    const wrapper = mount(EntityPanel, {
      attachTo: document.body,
      props: {
        modelValue,
        scene,
      },
      global: { provide, },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    await wrapper.get(`a[data-path=${modelValue[0].name}]`).trigger('click');

    const entityPane = wrapper.get('.entity-pane');
    expect(entityPane.get('[data-test=entity-type]').text()).toBe(modelValue[0].type);
    const nameInput = entityPane.get('[name=name]').element as HTMLInputElement;
    expect(nameInput.value).toBe(modelValue[0].name);
    const activeInput = entityPane.get('[name=active]').element as HTMLInputElement;
    expect(activeInput.checked).toBe(modelValue[0].active);
  });

  test('updateActive', async () => {
    const isActive = modelValue[0].active;
    const wrapper = mount(EntityPanel, {
      attachTo: document.body,
      props: {
        modelValue,
        scene,
      },
      global: { provide, },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    await wrapper.get(`a[data-path=${modelValue[0].name}]`).trigger('click');
    const entityPane = wrapper.get('.entity-pane');
    const activeInput = entityPane.get('[name=active]')
    expect((activeInput.element as HTMLInputElement).checked).toBe(isActive);
    await activeInput.trigger('click');
    expect((activeInput.element as HTMLInputElement).checked).toBe(!isActive);
  });
});

