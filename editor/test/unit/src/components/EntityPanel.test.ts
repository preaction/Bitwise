
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { mount, flushPromises } from '@vue/test-utils';
import * as Vue from "vue";
import { MockElectron } from '../../../mock/electron.js';
import MockGame from '../../../mock/game.js';
import EntityPanel from '../../../../src/components/EntityPanel.vue';
import Tree from '../../../../src/components/Tree.vue';

import TransformEdit from '../../../../src/components/bitwise/Transform.vue';
import OrthographicCameraEdit from '../../../../src/components/bitwise/OrthographicCamera.vue';
import SpriteEdit from '../../../../src/components/bitwise/Sprite.vue';

const game = new MockGame();
const systemForms = Vue.markRaw({});
const componentForms = Vue.markRaw({
  Transform: TransformEdit,
  OrthographicCamera: OrthographicCameraEdit,
  Sprite: SpriteEdit,
});

describe('EntityPanel', () => {
  test('renders scene tree with entities', async () => {
    const modelValue = {
      name: "Example",
      component: "SceneEdit",
      entities: [
        {
          path: "Camera",
          type: "Camera",
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
      ],
      components: [
        "Transform",
        "OrthographicCamera",
        "Sprite",
      ],
      systems: [
        {
          name: "Input",
          data: {},
        },
        {
          name: "Render",
          data: {},
        },
      ],
    };
    const scene = game.addScene();
    const wrapper = mount(EntityPanel, {
      props: {
        modelValue,
        scene,
      },
      global: {
        provide: {
          systemForms,
          componentForms,
          openTab: () => (null),
          assets: [],
        },
      },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    const tree = wrapper.getComponent(Tree);
    expect(tree.get('[data-test=name]').text()).toBe(modelValue.entities[0].path);
  });

  test('tree is updated when scene data changes', async () => {
    const modelValue = {
      name: "Example",
      component: "SceneEdit",
    };
    const scene = game.addScene();
    const wrapper = mount(EntityPanel, {
      attachTo: document.body,
      props: {
        modelValue,
        scene,
      },
      global: {
        provide: {
          systemForms,
          componentForms,
          openTab: () => (null),
          assets: [],
        },
      },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.findAllComponents(Tree)).toHaveLength(0);

    const entities = [
      {
        path: "Camera",
        type: "Camera",
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
    await wrapper.setProps({
      modelValue: {
        ...modelValue,
        entities,
      },
    });

    const tree = wrapper.getComponent(Tree);
    expect(tree.get('[data-test=name]').text()).toBe(entities[0].path);
  });
});

