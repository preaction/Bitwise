import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { mount, flushPromises } from '@vue/test-utils';
import { MockElectron } from '../../../mock/electron.js';
import MockBackend from '../../../mock/backend.js';
import ProjectSelect from '../../../../src/components/ProjectSelect.vue';

let backend:MockBackend;
const mockNewProject = jest.fn() as jest.MockedFunction<typeof global.electron.newProject>;
const mockOpenProject = jest.fn() as jest.MockedFunction<typeof global.electron.openProject>;
const mockListProjects = jest.fn() as jest.MockedFunction<typeof backend.listProjects>;
beforeEach( () => {
  mockListProjects.mockReset();
  mockListProjects.mockResolvedValue( [] );
  mockNewProject.mockReset();
  mockOpenProject.mockReset();

  global.electron = new MockElectron();
  global.electron.newProject = mockNewProject;
  global.electron.openProject = mockOpenProject;

  backend = new MockBackend();
  backend.listProjects = mockListProjects;
});

describe('ProjectSelect', () => {
  test( 'list recent projects and select one', async () => {
    const projectList = [
      "Project One",
      "Project Two",
      "Directory/Project Three",
    ];
    mockListProjects.mockResolvedValue( projectList );

    const wrapper = mount(ProjectSelect, {
      global: {
        provide: {
          backend,
        },
      },
    });
    await flushPromises();
    expect( backend.listProjects ).toHaveBeenCalled();

    const recents = wrapper.findAll( '[data-test=recent-projects] > button' );
    expect( recents ).toHaveLength( projectList.length );
    expect( recents[0].text() ).toEqual( projectList[0].split('/').pop() );
    expect( recents[1].text() ).toEqual( projectList[1].split('/').pop() );
    expect( recents[2].text() ).toEqual( projectList[2].split('/').pop() );

    await wrapper.find('[data-test=recent-projects] > button').trigger('click');
    await wrapper.vm.$nextTick();
    expect( wrapper.emitted().select ).toHaveLength(1);
    expect( wrapper.emitted().select[0] ).toEqual([projectList[0]]);
  });

  test( 'create a new project', async () => {
    const dialogResult = {
      canceled: false,
      filePath: 'My Game',
    };
    mockNewProject.mockResolvedValue(dialogResult);

    const wrapper = mount(ProjectSelect, {
      global: {
        provide: {
          backend,
        },
      },
    });
    await wrapper.find('[data-test=newProject]').trigger('click');

    expect( global.electron.newProject ).toHaveBeenCalled();
    await wrapper.vm.$nextTick();
    expect( wrapper.emitted().select ).toHaveLength(1);
    expect( wrapper.emitted().select[0] ).toEqual(["My Game"]);
  });

  test( 'cancel the create new project dialog', async () => {
    const dialogResult = {
      canceled: true,
      filePath: '',
    };
    mockNewProject.mockResolvedValue(dialogResult);

    const wrapper = mount(ProjectSelect, {
      global: {
        provide: {
          backend,
        },
      },
    });
    await wrapper.find('[data-test=newProject]').trigger('click');

    expect( global.electron.newProject ).toHaveBeenCalled();
    await wrapper.vm.$nextTick();
    expect( wrapper.emitted() ).not.toHaveProperty('select');
  });

  test( 'open a project folder', async () => {
    const dialogResult = {
      canceled: false,
      filePaths: ['My Game'],
    };
    mockOpenProject.mockResolvedValue(dialogResult);

    const wrapper = mount(ProjectSelect, {
      global: {
        provide: {
          backend,
        },
      },
    });
    await wrapper.find('[data-test=openProject]').trigger('click');

    expect( global.electron.openProject ).toHaveBeenCalled();
    await wrapper.vm.$nextTick();
    expect( wrapper.emitted().select ).toHaveLength(1);
    expect( wrapper.emitted().select[0] ).toEqual(["My Game"]);
  });

  test( 'cancel the open a project folder dialog', async () => {
    const dialogResult = {
      canceled: true,
      filePaths: [],
    };
    mockOpenProject.mockResolvedValue(dialogResult);

    const wrapper = mount(ProjectSelect, {
      global: {
        provide: {
          backend,
        },
      },
    });
    await wrapper.find('[data-test=openProject]').trigger('click');

    expect( global.electron.openProject ).toHaveBeenCalled();
    await wrapper.vm.$nextTick();
    expect( wrapper.emitted() ).not.toHaveProperty( 'select' );
  });
});

