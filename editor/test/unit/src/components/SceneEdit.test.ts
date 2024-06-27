import { describe, expect, test, beforeEach, beforeAll, jest } from '@jest/globals';
import { mount, flushPromises } from '@vue/test-utils';
import * as Vue from "vue";
import { MockElectron } from '../../../mock/electron.js';
import Project from '../../../../src/model/Project.js';
import MockBackend from '../../../mock/backend.js';
import SceneEdit from '../../../../src/components/SceneEdit.vue';
import EntityPanel from '../../../../src/components/EntityPanel.vue';
import Tab from '../../../../src/model/Tab.js';
import TransformEdit from '../../../../src/components/bitwise/Transform.vue';
import OrthographicCameraEdit from '../../../../src/components/bitwise/OrthographicCamera.vue';
import SpriteEdit from '../../../../src/components/bitwise/Sprite.vue';
import { Asset, Load, Game, Scene } from '@fourstar/bitwise';

// Mock out the Game.start() method so we don't try (and fail) to create
// a WebGL context.
const mockStart = jest.spyOn(Game.prototype, 'start').mockImplementation(async () => { });
const mockRender = jest.spyOn(Scene.prototype, 'render').mockImplementation(async () => { });

beforeAll(() => {
  // XXX: This always returns true for a match, but we might want to
  // return `false` for devices when checking if they support mouse
  // input.
  Object.defineProperty(global, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

const stubs = {
  TabView: false,
  Panel: false,
};
const systemForms = Vue.markRaw({});
const componentForms = Vue.markRaw({
  Transform: TransformEdit,
  OrthographicCamera: OrthographicCameraEdit,
  Sprite: SpriteEdit,
});
let backend: MockBackend, project: Project, provide: any;
beforeEach(() => {
  global.electron = new MockElectron();
  global.confirm = () => true;
  backend = new MockBackend();
  project = new Project(backend, "testProject");
  provide = {
    backend,
    project,
    baseUrl: 'testProject',
    isBuilding: false,
    gameClass: Game,
    systemForms,
    componentForms,
    openTab: () => { },
  };
});

describe('SceneEdit', () => {
  let mockWriteItemData: jest.MockedFunction<typeof backend.writeItemData>,
    mockReadItemData: jest.MockedFunction<typeof backend.readItemData>,
    mockNewFile: jest.MockedFunction<typeof global.electron.newFile>;
  beforeEach(() => {
    mockWriteItemData = jest.fn() as jest.MockedFunction<typeof backend.writeItemData>;
    backend.writeItemData = mockWriteItemData;

    mockReadItemData = jest.fn() as jest.MockedFunction<typeof backend.readItemData>;
    mockReadItemData.mockResolvedValue("{}");
    backend.readItemData = mockReadItemData;

    mockNewFile = jest.fn() as jest.MockedFunction<typeof global.electron.newFile>;
    global.electron.newFile = mockNewFile;
  });

  test('create a new scene', async () => {
    mockWriteItemData.mockReturnValueOnce(Promise.resolve());
    const newFilePath = "NewScene.json";
    mockNewFile.mockReturnValueOnce(Promise.resolve({ canceled: false, filePath: newFilePath }));

    const asset = new Asset(new Load(), "");
    const modelValue = new Tab(project, asset);
    const onUpdate = jest.fn();
    const wrapper = mount(SceneEdit, {
      shallow: true,
      props: {
        modelValue,
        onUpdate,
      },
      global: {
        provide,
        stubs,
      },
    });
    onUpdate.mockImplementation((update: any) => Object.assign(wrapper.vm.modelValue, update));
    await flushPromises();
    const emitted = wrapper.emitted();
    expect(emitted).toHaveProperty('update');
    expect(emitted['update']).toHaveLength(1);
    expect(emitted['update'][0]).toMatchObject([{ edited: true, name: "NewScene", ext: '.json' }]);

    expect(wrapper.getComponent(EntityPanel).props('modelValue')).toMatchObject(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Camera',
        }),
      ]),
    );

    // Click the Save button
    const saveButton = wrapper.get('button[data-test=save]');
    expect(saveButton.attributes()).not.toHaveProperty('disabled');
    await saveButton.trigger('click');
    await flushPromises();

    // Verify the scene was saved
    expect(mockWriteItemData).toHaveBeenCalled();
    expect(mockWriteItemData.mock.calls[0][0]).toEqual(project.name);
    expect(mockWriteItemData.mock.calls[0][1]).toEqual(newFilePath);
    const jsonData = mockWriteItemData.mock.calls[0][2];
    expect(jsonData).toBeTruthy();
    expect(JSON.parse(jsonData)).toMatchObject({
      name: 'NewScene',
      component: 'SceneEdit',
    });
    expect(wrapper.emitted()).toHaveProperty('update');
    expect(wrapper.emitted()['update']).toHaveLength(2);
    expect(wrapper.emitted()['update'][1]).toMatchObject([{ edited: false, src: newFilePath, name: "NewScene", ext: ".json" }]);
  });

  describe('existing scene', () => {
    let sceneData: any, modelValue: Tab;
    beforeEach(() => {
      sceneData = {
        $schema: 1,
        name: "OldScene",
        component: "SceneEdit",
        components: ['Transform', 'Sprite', 'OrthographicCamera', 'UI'],
        systems: [
          { name: 'Input', data: {} },
          { name: 'Render', data: {} },
        ],
        entities: [
          {
            name: 'MyEntity',
            components: {
              Transform: {},
              Sprite: {},
            },
          },
        ],
      };
      const asset = new Asset(new Load(), "OldScene.json");
      asset.data = sceneData;
      modelValue = new Tab(project, asset);
      mockReadItemData.mockReturnValue(Promise.resolve(JSON.stringify(sceneData)));
      mockWriteItemData.mockReturnValue(Promise.resolve());
    });

    test('open an existing scene', async () => {
      const wrapper = mount(SceneEdit, {
        shallow: true,
        props: {
          modelValue,
        },
        global: {
          provide,
          stubs,
        },
      });
      await flushPromises();
      // No update event emitted for existing scene
      expect(wrapper.emitted()).not.toHaveProperty('update');
      let saveButton = wrapper.get('button[data-test=save]');
      expect(saveButton.attributes()).toHaveProperty('disabled');
      expect(wrapper.getComponent(EntityPanel).props('modelValue')).toEqual(sceneData.entities);
    });

    test('save an existing scene', async () => {
      modelValue.edited = true;
      const wrapper = mount(SceneEdit, {
        shallow: true,
        props: {
          modelValue,
        },
        global: {
          provide,
          stubs,
        },
      });
      await flushPromises();

      // Click the Save button
      let saveButton = wrapper.get('button[data-test=save]');
      expect(saveButton.attributes()).not.toHaveProperty('disabled');
      await saveButton.trigger('click');
      await flushPromises();

      // Verify the scene was saved
      expect(mockWriteItemData).toHaveBeenCalled();
      expect(mockWriteItemData.mock.calls[0][0]).toEqual(project.name);
      expect(mockWriteItemData.mock.calls[0][1]).toEqual(modelValue.src);
      expect(wrapper.emitted()).toHaveProperty('update');
      expect(wrapper.emitted()['update']).toHaveLength(1);
      expect(wrapper.emitted()['update'][0]).toMatchObject([{ edited: false }]);
    });

    test('rename a scene', async () => {
      modelValue.name = "NewScene";
      modelValue.edited = true;
      sceneData.name = 'NewScene';
      const wrapper = mount(SceneEdit, {
        shallow: true,
        props: {
          modelValue,
        },
        global: {
          provide,
          stubs,
        },
      });
      await flushPromises();

      let saveButton = wrapper.get('button[data-test=save]');
      expect(saveButton.attributes()).not.toHaveProperty('disabled');
      await saveButton.trigger('click');
      await flushPromises();

      // Verify the scene was saved
      expect(mockWriteItemData).toHaveBeenCalled();
      expect(mockWriteItemData.mock.calls[0][0]).toEqual(project.name);
      expect(mockWriteItemData.mock.calls[0][1]).toEqual(modelValue.src);
      expect(wrapper.emitted()).toHaveProperty('update');
      expect(wrapper.emitted()['update']).toHaveLength(1);
      expect(wrapper.emitted()['update'][0]).toMatchObject([{ edited: false }]);
    });

    test('play scene', async () => {
      const wrapper = mount(SceneEdit, {
        shallow: true,
        props: {
          modelValue,
        },
        global: {
          provide,
          stubs,
        },
      });
      await flushPromises();

      wrapper.setData({ gameClass: Game });

      let playButton = wrapper.get('button[data-test=play]');
      expect(playButton.attributes()).not.toHaveProperty('disabled');
      await playButton.trigger('click');
      await flushPromises();

      // Verify the scene is playing
      expect(mockStart).toHaveBeenCalled();

    });

    test('show grid', async () => {
      const onUpdate = jest.fn();
      const wrapper = mount(SceneEdit, {
        shallow: true,
        props: {
          modelValue,
          onUpdate,
        },
        global: {
          provide,
          stubs,
        },
      });
      onUpdate.mockImplementation((update: any) => Object.assign(wrapper.vm.modelValue, update));
      wrapper.setData({ gameClass: Game });
      await flushPromises();

      const gridBtnEl = wrapper.vm.$el.querySelector('[data-test="toggle-grid"]');
      expect(gridBtnEl.getAttribute('aria-pressed')).toBe('false');
      const gridBtn = wrapper.get('[data-test="toggle-grid"]');
      await gridBtn.trigger('click');
      expect(gridBtnEl.getAttribute('aria-pressed')).toBe('true');
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ edited: true }),
      );

      // Grid state is saved with scene data
      let saveButton = wrapper.get('button[data-test=save]');
      expect(saveButton.attributes()).not.toHaveProperty('disabled');
      await saveButton.trigger('click');
      expect(mockWriteItemData).toHaveBeenCalled();
      const sceneJson = mockWriteItemData.mock.lastCall?.[2] || '{}';
      expect(JSON.parse(sceneJson)).toMatchObject({
        editor: expect.objectContaining({ showGrid: true, snapToGrid: true }),
      });
    });

    test('changing an entity in EntityPanel enables save', async () => {
      const onUpdate = jest.fn();
      const wrapper = mount(SceneEdit, {
        props: {
          modelValue,
          onUpdate,
        },
        global: { provide },
      });
      wrapper.setData({ gameClass: Game });
      await flushPromises();

      const entityPanel = wrapper.getComponent(EntityPanel);
      entityPanel.vm.$emit('update:modelValue', sceneData.entities);

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ edited: true }),
      );
    });

    test('changing an entity in game enables save', async () => {
      const onUpdate = jest.fn();
      const wrapper = mount(SceneEdit, {
        props: {
          modelValue,
          onUpdate,
        },
        global: { provide },
      });
      wrapper.setData({ gameClass: Game });
      await flushPromises();
      await wrapper.vm.initializeEditor();

      const scene = wrapper.vm.editScene;
      const editorRender = scene.getSystem(scene.game.systems.EditorRender);
      editorRender.dispatchEvent({ type: 'updateEntity', eid: scene.eids[0], components: {} });

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ edited: true }),
      );
    });
  });

});

