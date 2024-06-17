import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { mount, flushPromises } from '@vue/test-utils';
import { MockElectron } from '../../../mock/electron.js';
import Project from '../../../../src/model/Project.js';
import MockBackend from '../../../mock/backend.js';
import SceneEdit from '../../../../src/components/SceneEdit.vue';
import EntityPanel from '../../../../src/components/EntityPanel.vue';
import Tab from '../../../../src/model/Tab.js';
import { Asset, Load, Game } from '@fourstar/bitwise';

// Mock out the Game.start() method so we don't try (and fail) to create
// a WebGL context.
const mockStart = jest.spyOn(Game.prototype, 'start').mockImplementation(async () => { });

const stubs = {
  TabView: false,
  Panel: false,
};
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
    const wrapper = mount(SceneEdit, {
      shallow: true,
      props: {
        modelValue,
        'onUpdate': (update: any) => Object.assign(wrapper.vm.modelValue, update),
      },
      global: {
        provide,
        stubs,
      },
    });
    await flushPromises();
    expect(wrapper.emitted()).toHaveProperty('update');
    expect(wrapper.emitted()['update']).toHaveLength(1);
    expect(wrapper.emitted()['update'][0]).toMatchObject([{ edited: true, name: "NewScene", ext: '.json' }]);
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
        name: "OldScene",
        component: "SceneEdit",
        components: ['Transform', 'Sprite', 'OrthographicCamera', 'UI'],
        systems: [
          { name: 'Input', data: {} },
          { name: 'Render', data: {} },
        ],
        entities: [],
      };
      const asset = new Asset(new Load(), "OldScene.json");
      asset.data = sceneData;
      modelValue = new Tab(project, asset);
      mockReadItemData.mockReturnValueOnce(Promise.resolve(JSON.stringify(sceneData)));
      mockWriteItemData.mockReturnValueOnce(Promise.resolve());
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

  });

});

