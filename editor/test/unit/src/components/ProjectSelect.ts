import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { MockElectron } from '../../../mock/electron.js';
import MockBackend from '../../../mock/backend.js';
import ProjectSelect from '../../../../src/components/ProjectSelect.vue';

let backend:MockBackend;
beforeEach( () => {
  global.electron = new MockElectron();
  backend = new MockBackend();
});

describe('ProjectSelect', () => {
  test( 'create a new project', async () => {
    // Mock the electron.newProject function to return a path
    const dialogResult = {
      canceled: false,
      filePath: 'My Game',
    };
    const mockNewProject = jest.fn() as jest.MockedFunction<typeof global.electron.newProject>;
    mockNewProject.mockReturnValue( new Promise( (resolve) => resolve(dialogResult) ) );
    global.electron.newProject = mockNewProject;

    const wrapper = mount(ProjectSelect, {
      provide: {
        backend,
      },
      global: {
        plugins: [
          createPinia(),
        ],
      },
    });
    // Click the Create Project button ([data-test=create])
    await wrapper.find('[data-test=newProject]').trigger('click');

    // Verify the electron.newProject function was called
    expect( global.electron.newProject ).toHaveBeenCalled();
    await wrapper.vm.$nextTick();
    // Verify the select event was emitted
    expect( wrapper.emitted().select ).toHaveLength(1);
  });

});

