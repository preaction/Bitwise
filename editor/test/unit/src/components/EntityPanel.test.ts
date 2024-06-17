
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { mount, flushPromises, config } from '@vue/test-utils';
import * as Vue from "vue";
import EntityPanel from '../../../../src/components/EntityPanel.vue';
import Tree from '../../../../src/components/Tree.vue';

import TransformEdit from '../../../../src/components/bitwise/Transform.vue';
import OrthographicCameraEdit from '../../../../src/components/bitwise/OrthographicCamera.vue';
import SpriteEdit from '../../../../src/components/bitwise/Sprite.vue';
import { Game } from '@fourstar/bitwise';
import type { Entity, EntityData, Scene } from '@fourstar/bitwise';

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
config.global.provide = { ...provide };

let modelValue: Array<EntityData>;
let game: Game, scene: Scene, entity: Entity;
beforeEach(async () => {
  modelValue = [
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

  game = new Game({});
  scene = game.addScene();
  await scene.thaw({
    $schema: '1',
    name: 'Scene Name',
    entities: modelValue,
    components: [],
    systems: [],
  });
  entity = scene.getEntityByPath(modelValue[0].name) as Entity;
});

describe('EntityPanel', () => {
  test('renders scene tree with entities', async () => {
    const wrapper = mount(EntityPanel, {
      props: {
        modelValue,
        scene,
      },
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

  describe('update entity data', () => {
    const mockUpdate = jest.fn();
    let wrapper = mount(EntityPanel);
    beforeEach(async () => {
      mockUpdate.mockReset();
      wrapper = mount(EntityPanel, {
        attachTo: document.body,
        props: {
          modelValue,
          scene,
          'onUpdate:modelValue': mockUpdate,
        },
      });
      await flushPromises();
      await wrapper.vm.$nextTick();
      await wrapper.get(`a[data-path=${modelValue[0].name}]`).trigger('click');
    });

    test('updateActive', async () => {
      const isActive = modelValue[0].active;
      const entityPane = wrapper.get('.entity-pane');
      const activeInput = entityPane.get('[name=active]')
      expect((activeInput.element as HTMLInputElement).checked).toBe(isActive);
      await activeInput.trigger('click');
      expect((activeInput.element as HTMLInputElement).checked).toBe(!isActive);
    });

    test('updateEntityName', async () => {
      const name = modelValue[0].name;
      const entityPane = wrapper.get('.entity-pane');
      const nameInput = entityPane.get('[name=name]')
      expect((nameInput.element as HTMLInputElement).value).toBe(name);
      let newName = 'New Name';
      await nameInput.setValue(newName);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      let newModelValue = mockUpdate.mock.lastCall?.[0] as EntityData[];
      expect(newModelValue[0].name).toBe(newName);
      await wrapper.setProps({ modelValue: newModelValue });
      expect((nameInput.element as HTMLInputElement).value).toBe(newName);
      expect(wrapper.find(`a[data-path="${newName}"]`).exists()).toBeTruthy();

      // Should be able to update it again
      newName = 'Another Name';
      await nameInput.setValue(newName);
      expect(mockUpdate).toHaveBeenCalledTimes(2);
      newModelValue = mockUpdate.mock.lastCall?.[0] as EntityData[];
      expect(newModelValue[0].name).toBe(newName);
      await wrapper.setProps({ modelValue: newModelValue });
      expect((nameInput.element as HTMLInputElement).value).toBe(newName);
      expect(wrapper.find(`a[data-path="${newName}"]`).exists()).toBeTruthy();
    });
  });

  describe('rearrange entities via drag/drop', () => {
    let setData = jest.fn();
    let dragEventCommon = {
      type: "dragstart",
      preventDefault: jest.fn(),
      dataTransfer: {
        dropEffect: "none",
        setData,
        setDragImage: jest.fn(),
      } as unknown as DataTransfer,
    } as unknown as DragEvent;

    describe('dragstart', () => {
      test('dragstart stores entity path', async () => {
        const dragEvent = { ...dragEventCommon };
        const wrapper = mount(EntityPanel, {
          attachTo: document.body,
          props: {
            modelValue,
            scene,
          },
        });
        await flushPromises();
        await wrapper.vm.$nextTick();

        await wrapper.get(`[data-path=${modelValue[0].name}]`).trigger('dragstart', dragEvent);
        expect(setData).toHaveBeenCalledWith('bitwise/entity', modelValue[0].name);
      });

      test('dragstart stores child path', async () => {
        const child = entity.addEntity({ name: 'Child' });
        modelValue[0] = entity.freeze();

        const wrapper = mount(EntityPanel, {
          attachTo: document.body,
          props: {
            modelValue,
            scene,
          },
        });
        await flushPromises();
        await wrapper.vm.$nextTick();

        // First, expand to show the child
        await wrapper.get(`[data-path=${modelValue[0].name}] .show-children`).trigger('click');
        const dragEvent = { ...dragEventCommon };
        const childPath = [modelValue[0].name, child.name].join('/');
        await wrapper.get(`[data-path="${childPath}"]`).trigger('dragstart', dragEvent);
        expect(setData).toHaveBeenCalledWith('bitwise/entity', childPath);
      });
    });

    describe('drop entity', () => {
      const getData = jest.fn();
      const dropEventCommon = {
        type: "drop",
        preventDefault: jest.fn(),
        dataTransfer: {
          dropEffect: "none",
          getData,
        } as unknown as DataTransfer,
        offsetX: 0,
        offsetY: 0,
      };

      let sibling: Entity;
      beforeEach(() => {
        getData.mockReset();
        sibling = scene.addEntity({ name: 'Sibling' });
        modelValue.push(sibling.freeze());
      });

      test('drop as next sibling', async () => {
        const onUpdate = jest.fn();
        const wrapper = mount(EntityPanel, {
          attachTo: document.body,
          props: {
            modelValue,
            scene,
            'onUpdate:modelValue': onUpdate,
          },
        });
        await flushPromises();
        await wrapper.vm.$nextTick();

        getData.mockReturnValueOnce(modelValue[0].name);
        const dropEvent = {
          ...dropEventCommon,
          offsetY: 200,
        };
        await wrapper.get(`[data-path=${modelValue[1].name}]`).trigger('drop', dropEvent);

        expect(onUpdate).toHaveBeenCalledWith([
          modelValue[1],
          modelValue[0],
        ]);
        // XXX: Check scene was updated correctly
      });

      test('drop as previous sibling', async () => {
        const onUpdate = jest.fn();
        const wrapper = mount(EntityPanel, {
          attachTo: document.body,
          props: {
            modelValue,
            scene,
            'onUpdate:modelValue': onUpdate,
          },
        });
        await flushPromises();
        await wrapper.vm.$nextTick();

        getData.mockReturnValueOnce(modelValue[1].name);
        const dropEvent = {
          ...dropEventCommon,
          offsetY: 0,
        };
        await wrapper.get(`[data-path=${modelValue[0].name}]`).trigger('drop', dropEvent);

        expect(onUpdate).toHaveBeenCalledWith([
          modelValue[1],
          modelValue[0],
        ]);
        // XXX: Check scene was updated correctly
      });

      test('drop as child', async () => {
        const onUpdate = jest.fn();
        const wrapper = mount(EntityPanel, {
          attachTo: document.body,
          props: {
            modelValue,
            scene,
            'onUpdate:modelValue': onUpdate,
          },
        });
        await flushPromises();
        await wrapper.vm.$nextTick();

        getData.mockReturnValueOnce(modelValue[0].name);
        const dropEvent = {
          ...dropEventCommon,
          offsetX: 200,
        };
        await wrapper.get(`[data-path=${modelValue[1].name}]`).trigger('drop', dropEvent);

        const expectModelValue = [
          {
            ...modelValue[1],
            children: [
              modelValue[0],
            ],
          },
        ];
        expect(onUpdate).toHaveBeenCalledWith(expectModelValue);
        await wrapper.setProps({
          modelValue: expectModelValue,
        });

        // Check scene was updated correctly
        await wrapper.get(`[data-path=${modelValue[1].name}] .show-children`).trigger('click');
        expect(wrapper.find(`[data-path="${modelValue[1].name}/${modelValue[0].name}"]`).exists()).toBeTruthy();
      });

      test('drop child as sibling', async () => {
        const child = sibling.addEntity({ name: 'Child' });
        const childData = child.freeze();
        modelValue[1] = sibling.freeze();

        const onUpdate = jest.fn();
        const wrapper = mount(EntityPanel, {
          attachTo: document.body,
          props: {
            modelValue,
            scene,
            'onUpdate:modelValue': onUpdate,
          },
        });
        await flushPromises();
        await wrapper.vm.$nextTick();

        getData.mockReturnValueOnce(`${modelValue[1].name}/${child.name}`);
        const dropEvent = {
          ...dropEventCommon,
          offsetY: 200,
        };
        await wrapper.get(`[data-path=${modelValue[0].name}]`).trigger('drop', dropEvent);

        const expectModelValue = [
          modelValue[0],
          childData,
          {
            ...modelValue[1],
            children: undefined,
          },
        ];
        expect(onUpdate).toHaveBeenCalledWith(expectModelValue);
        await wrapper.setProps({
          modelValue: expectModelValue,
        });

        // Check scene was updated correctly
        expect(wrapper.find(`[data-path="${modelValue[1].name}"] .show-children`).exists()).toBeFalsy();
      });
    });
  });

});

