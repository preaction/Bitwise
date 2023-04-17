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
  test( 'create a new scene', async () => {
    const mockWriteItemData = jest.fn() as jest.MockedFunction<typeof backend.writeItemData>;
    backend.writeItemData = mockWriteItemData;
    mockWriteItemData.mockReturnValueOnce( Promise.resolve() );

    const newFilePath = "NewScene.json";
    const mockNewFile = jest.fn() as jest.MockedFunction<typeof global.electron.newFile>;
    mockNewFile.mockReturnValue(
      new Promise( (resolve) => resolve({ canceled: false, filePath: newFilePath }) ),
    );
    global.electron.newFile = mockNewFile;

    const modelValue = new Tab(new ProjectItem(project, "", "SceneEdit"));
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
    expect( wrapper.emitted() ).toHaveProperty('update:modelValue');
    expect( wrapper.emitted()['update:modelValue'] ).toHaveLength(1);
    expect( wrapper.emitted()['update:modelValue'][0] ).toMatchObject([{edited: true, src: "", name: "NewScene", ext: '.json'}]);

    // Click the Save button
    const saveButton = wrapper.get('button[data-test=save]');
    expect( saveButton.attributes().disabled ).toBeFalsy();
    await saveButton.trigger('click');
    await flushPromises();

    // Verify the scene was saved
    expect( mockWriteItemData ).toHaveBeenCalled();
    expect( mockWriteItemData.mock.calls[0][0] ).toEqual( project.name );
    expect( mockWriteItemData.mock.calls[0][1] ).toEqual(newFilePath);
    expect( wrapper.emitted() ).toHaveProperty('update:modelValue');
    expect( wrapper.emitted()['update:modelValue'] ).toHaveLength(2);
    expect( wrapper.emitted()['update:modelValue'][1] ).toMatchObject([{edited: false, src: newFilePath, name: "NewScene", ext: ".json"}]);
  });

});

