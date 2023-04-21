import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { mount, flushPromises } from '@vue/test-utils';
import { MockElectron } from '../../../mock/electron.js';
import { Game } from '@fourstar/bitwise';
import Project from '../../../../src/model/Project.js';
import MockBackend from'../../../mock/backend.js';
import SceneEdit from '../../../../src/components/SceneEdit.vue';
import Tab from '../../../../src/model/Tab.js';
import ProjectItem from '../../../../src/model/ProjectItem.js';

let backend:MockBackend, project:Project, provide:any;
beforeEach( () => {
  global.electron = new MockElectron();
  backend = new MockBackend();
  project = new Project( backend, "testProject" );
  provide = {
    backend,
    project,
    baseUrl: 'testProject',
    isBuilding: false,
    gameClass: Game,
  };
});

describe('SceneEdit', () => {
  let mockWriteItemData:jest.MockedFunction<typeof backend.writeItemData>,
      mockReadItemData:jest.MockedFunction<typeof backend.readItemData>,
      mockNewFile:jest.MockedFunction<typeof global.electron.newFile>;
  beforeEach( () => {
    mockWriteItemData = jest.fn() as jest.MockedFunction<typeof backend.writeItemData>;
    backend.writeItemData = mockWriteItemData;

    mockReadItemData = jest.fn() as jest.MockedFunction<typeof backend.readItemData>;
    backend.readItemData = mockReadItemData;

    mockNewFile = jest.fn() as jest.MockedFunction<typeof global.electron.newFile>;
    global.electron.newFile = mockNewFile;
  } );

  test( 'create a new scene', async () => {
    mockWriteItemData.mockReturnValueOnce( Promise.resolve() );
    const newFilePath = "NewScene.json";
    mockNewFile.mockReturnValueOnce( Promise.resolve({ canceled: false, filePath: newFilePath }) );

    const modelValue = new Tab(new ProjectItem(project, "", "SceneEdit"));
    const wrapper = mount(SceneEdit, {
      shallow: true,
      props: {
        modelValue,
        'onUpdate': (update:any) => Object.assign( wrapper.vm.modelValue, update ),
      },
      global: {
        provide,
      },
    });
    await flushPromises();
    expect( wrapper.emitted() ).toHaveProperty('update');
    expect( wrapper.emitted()['update'] ).toHaveLength(1);
    expect( wrapper.emitted()['update'][0] ).toMatchObject([{edited: true, name: "NewScene", ext: '.json'}]);

    // Click the Save button
    const saveButton = wrapper.get('button[data-test=save]');
    expect( saveButton.attributes() ).not.toHaveProperty( 'disabled' );
    await saveButton.trigger('click');
    await flushPromises();

    // Verify the scene was saved
    expect( mockWriteItemData ).toHaveBeenCalled();
    expect( mockWriteItemData.mock.calls[0][0] ).toEqual( project.name );
    expect( mockWriteItemData.mock.calls[0][1] ).toEqual(newFilePath);
    expect( wrapper.emitted() ).toHaveProperty('update');
    expect( wrapper.emitted()['update'] ).toHaveLength(2);
    expect( wrapper.emitted()['update'][1] ).toMatchObject([{edited: false, src: newFilePath, name: "NewScene", ext: ".json"}]);
  });

  test('edit an existing scene', async () => {
    const sceneData = {
      name: "OldScene",
      components: [ 'Transform', 'Sprite', 'OrthographicCamera', 'UI' ],
      systems: [
        { name: 'Input', data: {} },
        { name: 'Render', data: {} },
      ],
      entities: [],
    };
    mockWriteItemData.mockReturnValueOnce( Promise.resolve() );
    mockReadItemData.mockReturnValueOnce( Promise.resolve(JSON.stringify(sceneData)) );

    const modelValue = new Tab(new ProjectItem(project, "OldScene.json", "SceneEdit"));
    const wrapper = mount(SceneEdit, {
      shallow: true,
      props: {
        modelValue,
      },
      global: {
        provide,
      },
    });
    await flushPromises();
    // No update event emitted for existing scene
    expect( wrapper.emitted() ).not.toHaveProperty('update');
    let saveButton = wrapper.get('button[data-test=save]');
    expect( saveButton.attributes() ).toHaveProperty( 'disabled' );

    // Click the Save button
    wrapper.vm.modelValue.edited = true;
    await wrapper.vm.$nextTick();
    expect( saveButton.attributes() ).not.toHaveProperty( 'disabled' );
    await saveButton.trigger('click');
    await flushPromises();

    // Verify the scene was saved
    expect( mockWriteItemData ).toHaveBeenCalled();
    expect( mockWriteItemData.mock.calls[0][0] ).toEqual( project.name );
    expect( mockWriteItemData.mock.calls[0][1] ).toEqual(modelValue.src);
    expect( wrapper.emitted() ).toHaveProperty('update');
    expect( wrapper.emitted()['update'] ).toHaveLength(1);
    expect( wrapper.emitted()['update'][0] ).toMatchObject([{edited: false}]);
  });

  test('rename a scene', async () => {
    const sceneData = {
      name: "OldScene",
      components: [ 'Transform', 'Sprite', 'OrthographicCamera', 'UI' ],
      systems: [
        { name: 'Input', data: {} },
        { name: 'Render', data: {} },
      ],
      entities: [],
    };
    mockWriteItemData.mockReturnValueOnce( Promise.resolve() );
    mockReadItemData.mockReturnValueOnce( Promise.resolve(JSON.stringify(sceneData)) );

    const modelValue = new Tab(new ProjectItem(project, "OldScene.json", "SceneEdit"));
    const wrapper = mount(SceneEdit, {
      shallow: true,
      props: {
        modelValue,
      },
      global: {
        provide,
      },
    });
    await flushPromises();
    // No update event emitted for existing scene
    expect( wrapper.emitted() ).not.toHaveProperty('update');
    let saveButton = wrapper.get('button[data-test=save]');
    expect( saveButton.attributes() ).toHaveProperty( 'disabled' );

    // Rename
    wrapper.vm.modelValue.name = "NewScene";
    // Click the Save button
    wrapper.vm.modelValue.edited = true;
    await wrapper.vm.$nextTick();
    expect( saveButton.attributes() ).not.toHaveProperty( 'disabled' );
    await saveButton.trigger('click');
    await flushPromises();

    // Verify the scene was saved
    expect( mockWriteItemData ).toHaveBeenCalled();
    expect( mockWriteItemData.mock.calls[0][0] ).toEqual( project.name );
    expect( mockWriteItemData.mock.calls[0][1] ).toEqual(modelValue.src);
    expect( wrapper.emitted() ).toHaveProperty('update');
    expect( wrapper.emitted()['update'] ).toHaveLength(1);
    expect( wrapper.emitted()['update'][0] ).toMatchObject([{edited: false}]);
  });

});

