import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { MockElectron } from '../../mock/electron.js';
import MockBackend from'../../mock/backend.js';
import App from '../../../src/App.vue';
import SceneEdit from '../../../src/components/SceneEdit.vue';
import ProjectSelect from '../../../src/components/ProjectSelect.vue';
import Tab from '../../../src/model/Tab.js';
import Project from '../../../src/model/Project.js';
import ProjectItem from '../../../src/model/ProjectItem.js';

let backend:MockBackend, project:Project;
const mockListItems = jest.fn() as jest.MockedFunction<typeof backend.listItems>;
const mockOpenProject = jest.fn() as jest.MockedFunction<typeof backend.openProject>;
const mockBuildProject = jest.fn() as jest.MockedFunction<typeof backend.buildProject>;
beforeEach( () => {
  mockListItems.mockReset();
  mockOpenProject.mockReset();
  mockBuildProject.mockReset();

  global.electron = new MockElectron();
  backend = new MockBackend();
  backend.listItems = mockListItems;
  backend.openProject = mockOpenProject;
  backend.buildProject = mockBuildProject;

  project = new Project( backend, "Project" );
  mockOpenProject.mockReturnValue( Promise.resolve( project ) );
});

describe('App', () => {
  // Inspect the raw component options
  test('has data', () => {
    expect(typeof App.data).toBe('function')
  });

  test('shows project dialog', async () => {
    const wrapper = mount(App, {
      attachTo: document.body,
      props: { backend },
      global: {
        config: {
          unwrapInjectedRef: true,
        },
        plugins: [
          createPinia(),
        ],
      },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    const modal = wrapper.getComponent({ ref: 'projectDialog' });
    expect( modal ).toBeDefined();
    expect( modal.props('show') ).toBeTruthy();
  });

  test('loads selected project', async () => {
    const projectItems = [
      new ProjectItem( project, "OldScene.json", "SceneEdit" ),
    ];
    mockListItems.mockResolvedValue( projectItems );

    mockBuildProject.mockResolvedValue( "test/mock/game.ts" );
    jest.mock("../../mock/game.ts");

    const wrapper = mount(App, {
      attachTo: document.body,
      props: { backend },
      global: {
        config: {
          unwrapInjectedRef: true,
        },
        plugins: [
          createPinia(),
        ],
      },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    const modal = wrapper.getComponent(ProjectSelect);
    modal.vm.$emit('select', project.name);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect( mockOpenProject ).toHaveBeenCalledWith(project.name);
    expect( wrapper.vm.project.name ).toBe(project.name);

    expect( mockListItems ).toHaveBeenCalled();

    // XXX: Saves session info
    // XXX: Saves state info
  });

  test('loads scene in new tab', async () => {
    const projectItems = [
      new ProjectItem( project, "OldScene.json", "SceneEdit" ),
    ];
    mockListItems.mockReturnValueOnce( Promise.resolve( projectItems ) );

    mockBuildProject.mockResolvedValue( "test/mock/game.ts" );
    jest.mock("../../mock/game.ts");

    const wrapper = mount(App, {
      attachTo: document.body,
      props: { backend },
      global: {
        config: {
          unwrapInjectedRef: true,
        },
        plugins: [
          createPinia(),
        ],
        stubs: {
          SceneEdit: true,
        },
      },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Double-click an item in the project tree
    const item:DirectoryItem = { path: 'OldScene.json' };
    const projectTree = wrapper.getComponent({ ref: 'projectTree' });
    projectTree.vm.ondblclickitem( item );
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Opens tab w/ correct info
    const tabBar = wrapper.get({ ref: 'tabBar' });
    const tabElement = tabBar.get( 'a:last-child' );
    expect( tabElement.text() ).toBe( "OldScene" );
    expect( tabElement.attributes('aria-current') ).toBe('true');

    // Shows current tab
    const editorTab = wrapper.getComponent(SceneEdit);
    expect( editorTab.vm.modelValue ).toBeInstanceOf( Tab );
    expect( editorTab.vm.modelValue ).toMatchObject({
      src: "OldScene.json",
    });

    // XXX: Saves session info
    // XXX: Saves state info
  });
});

