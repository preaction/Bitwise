import {describe, expect, test, beforeEach, afterEach, jest, beforeAll} from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { MockElectron } from '../../mock/electron.js';
import MockBackend from '../../mock/backend.js';
import MockGame from '../../mock/game.js';
import App from '../../../src/App.vue';
import SceneEdit from '../../../src/components/SceneEdit.vue';
import ProjectSelect from '../../../src/components/ProjectSelect.vue';
import Tab from '../../../src/model/Tab.js';
import Project from '../../../src/model/Project.js';
import ProjectItem from '../../../src/model/ProjectItem.js';

jest.mock("../../mock/game.ts");

let backend:MockBackend, project:Project;
const mockListItems = jest.fn() as jest.MockedFunction<typeof backend.listItems>;
const mockOpenProject = jest.fn() as jest.MockedFunction<typeof backend.openProject>;
const mockBuildProject = jest.fn() as jest.MockedFunction<typeof backend.buildProject>;
const mockGetState = jest.fn() as jest.MockedFunction<typeof backend.getState>;
const mockSetState = jest.fn() as jest.MockedFunction<typeof backend.setState>;
beforeEach( () => {
  mockListItems.mockReset();
  mockOpenProject.mockReset();
  mockBuildProject.mockReset();
  mockGetState.mockReset().mockResolvedValue({});
  mockSetState.mockReset();

  global.electron = new MockElectron();
  backend = new MockBackend();
  backend.listItems = mockListItems;
  backend.openProject = mockOpenProject;
  backend.buildProject = mockBuildProject;
  backend.getState = mockGetState;
  backend.setState = mockSetState;

  project = new Project( backend, "Project Name" );
  mockOpenProject.mockReturnValue( Promise.resolve( project ) );
});
afterEach( () => {
  sessionStorage.clear();
} );

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

  describe('loading project code', () => {
    let projectItems = [] as ProjectItem[];
    const MockedGame = jest.mocked( MockGame );
    beforeEach( async () => {
      projectItems = [
        new ProjectItem( project, "OldScene.json", "SceneEdit" ),
      ];
      mockListItems.mockResolvedValue( projectItems );
      mockBuildProject.mockResolvedValue( "test/mock/game.ts" );
      global.fetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
    });
    afterEach( () => {
      mockListItems.mockReset();
      mockBuildProject.mockReset();
      MockedGame.mockReset();
    } );

    test( 'builds and loads game class', async () => {
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
    });

    test( 'loads system and component forms', async () => {
      MockedGame.mockImplementation( () => {
        const MockGame = jest.requireActual<typeof import('../../mock/game.js')>('../../mock/game.js').default;
        const game = new MockGame();
        game.components = {
          TestComponent: { editorComponent: 'test/mock/componentEditForm.vue' },
        };
        game.systems = {
          TestSystem: { editorComponent: 'test/mock/systemEditForm.vue' },
        };
        return jest.mocked( game );
      });
      const mockFetch = jest.spyOn( global, "fetch" );
      // @ts-ignore
      mockFetch.mockImplementationOnce( () => {
        return Promise.resolve({
          ok: true,
          text: () => '',
        });
      });
      // @ts-ignore
      mockFetch.mockImplementationOnce( () => {
        return Promise.resolve({
          ok: true,
          text: () => '',
        });
      });

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

      expect( mockFetch ).toHaveBeenCalledTimes(2);
      expect( mockFetch.mock.calls[0] ).toEqual([ 'bfile://Project Name/test/mock/componentEditForm.vue' ]);
      expect( mockFetch.mock.calls[1] ).toEqual([ 'bfile://Project Name/test/mock/systemEditForm.vue' ]);
    });
  });

  describe('can load items from project tree', () => {
    let projectItems:ProjectItem[] = [];
    const cleanup = [] as Array<()=>void>;

    beforeEach( () => {
      projectItems = [
        new ProjectItem( project, "directory", "directory" ),
        new ProjectItem( project, "LoadScene.json", "SceneEdit" ),
      ];
      projectItems[0].children = [
        new ProjectItem( project, "directory/OldScene.json", "SceneEdit" ),
      ];
      mockListItems.mockReset().mockResolvedValue( projectItems );
      mockBuildProject.mockReset().mockResolvedValue( "test/mock/game.ts" );
      jest.mock("../../mock/game.ts");
    });
    afterEach( () => {
      cleanup.forEach( c => c() );
      cleanup.length = 0;
    });

    test( 'can load scene from root', async () => {
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
      cleanup.push( wrapper.unmount.bind(wrapper) );
      await flushPromises();
      await wrapper.vm.$nextTick();

      const modal = wrapper.getComponent(ProjectSelect);
      modal.vm.$emit('select', project.name);
      await flushPromises();
      await wrapper.vm.$nextTick();
      expect( mockOpenProject ).toHaveBeenCalledWith(project.name);
      expect( mockListItems ).toHaveBeenCalled();

      // Double-click an item in the project tree
      const item:DirectoryItem = { path: 'LoadScene.json' };
      const projectTree = wrapper.getComponent({ ref: 'projectTree' });
      projectTree.vm.ondblclickitem( item );
      await flushPromises();
      await wrapper.vm.$nextTick();

      // Opens tab w/ correct info
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll( 'a' );
      expect( tabElements ).toHaveLength(1);
      expect( tabElements[0].text() ).toBe( "LoadScene" );
      expect( tabElements[0].attributes('aria-current') ).toBe('true');

      // Shows current tab
      const editorTab = wrapper.getComponent(SceneEdit);
      expect( editorTab.vm.modelValue ).toBeInstanceOf( Tab );
      expect( editorTab.vm.modelValue ).toMatchObject({
        src: "LoadScene.json",
      });

      // XXX: Saves session info
      // Saves state info
      expect( mockSetState ).toHaveBeenCalled();
      expect( mockSetState.mock.lastCall?.[0] ).toBe("app");
      expect( mockSetState.mock.lastCall?.[1] ).toMatchObject({ currentTabIndex: 0 });
    });

    test( 'can load scene from directory', async () => {
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
      cleanup.push( wrapper.unmount.bind(wrapper) );
      await flushPromises();
      await wrapper.vm.$nextTick();

      const modal = wrapper.getComponent(ProjectSelect);
      modal.vm.$emit('select', project.name);
      await flushPromises();
      await wrapper.vm.$nextTick();
      expect( mockOpenProject ).toHaveBeenCalledWith(project.name);
      expect( mockListItems ).toHaveBeenCalled();

      // Double-click an item in the project tree
      const item:DirectoryItem = { path: 'directory/OldScene.json' };
      const projectTree = wrapper.getComponent({ ref: 'projectTree' });
      projectTree.vm.ondblclickitem( item );
      await flushPromises();
      await wrapper.vm.$nextTick();

      // Opens tab w/ correct info
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll( 'a' );
      expect( tabElements ).toHaveLength(1);
      expect( tabElements[0].text() ).toBe( "OldScene" );
      expect( tabElements[0].attributes('aria-current') ).toBe('true');

      // Shows current tab
      const editorTab = wrapper.getComponent(SceneEdit);
      expect( editorTab.vm.modelValue ).toBeInstanceOf( Tab );
      expect( editorTab.vm.modelValue ).toMatchObject({
        src: "directory/OldScene.json",
      });

      // XXX: Saves session info
      // Saves state info
      expect( mockSetState.mock.lastCall?.[0] ).toBe("app");
      expect( mockSetState.mock.lastCall?.[1] ).toMatchObject({ currentTabIndex: 0 });
    });
  });
});

