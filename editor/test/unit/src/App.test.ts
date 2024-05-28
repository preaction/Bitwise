import { describe, expect, test, beforeEach, afterEach, jest, beforeAll } from '@jest/globals';
import { flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { MockElectron } from '../../mock/electron.js';
import type { DirectoryItem } from '../../../src/Backend.js';
import Tree from '../../../src/components/Tree.vue';
import MockBackend from '../../mock/backend.js';
import MockGame from '../../mock/game.js';
import App from '../../../src/App.vue';
import SceneEdit from '../../../src/components/SceneEdit.vue';
import ImageView from '../../../src/components/ImageView.vue';
import type Modal from '../../../src/components/Modal.vue';
import ProjectSelect from '../../../src/components/ProjectSelect.vue';
import Tab from '../../../src/model/Tab.js';
import Project from '../../../src/model/Project.js';

jest.mock("../../mock/game.ts");
const MockGameConstructor = jest.requireActual<typeof import('../../mock/game.js')>('../../mock/game.js').default;

const findAsset = async (wrapper: VueWrapper, path: string) => {
  const pathParts = path.split('/');
  for (var i = 0; i < pathParts.length; i++) {
    const pathPart = pathParts.slice(0, i + 1).join('/');
    const assetTree = wrapper.findAllComponents(Tree).find((wrapper) => wrapper.props('node').path == pathPart);
    if (!assetTree) {
      throw `Could not find Tree for asset path "${pathPart} (looking for ${path})"`;
    }
    if (i == pathParts.length - 1) {
      return assetTree;
    }
    await assetTree.get('.show-children').trigger('click');
  }
  throw `Could not find Tree for asset path "${path}"`;
};

let backend: MockBackend, project: Project, projectItems: DirectoryItem[];
const MockedGame = jest.mocked(MockGame);
const cleanup = [] as Array<() => void>;
const mockOpenProject = jest.fn() as jest.MockedFunction<typeof backend.openProject>;
const mockBuildProject = jest.fn() as jest.MockedFunction<typeof backend.buildProject>;
const mockLoadGameClass = jest.fn() as jest.MockedFunction<typeof project.loadGameClass>;
const mockGetState = jest.fn() as jest.MockedFunction<typeof backend.getState>;
const mockSetState = jest.fn() as jest.MockedFunction<typeof backend.setState>;
const mockReadItemData = jest.fn() as jest.MockedFunction<typeof backend.readItemData>;
beforeEach(async () => {
  global.fetch = jest.fn() as jest.MockedFunction<typeof global.fetch>
  mockGetState.mockResolvedValue({});

  global.electron = new MockElectron();
  backend = new MockBackend();
  backend.openProject = mockOpenProject;
  backend.buildProject = mockBuildProject;
  backend.getState = mockGetState;
  backend.setState = mockSetState;
  backend.readItemData = mockReadItemData;

  const mockData: { [key: string]: string } = {
    'LoadScene.json': '{ "component": "SceneEdit" }',
    'directory/OldScene.json': '{ "component": "SceneEdit" }',
    'sheet.xml': `<?xml version="1.0" encoding="UTF-8"?>
      <TextureAtlas imagePath="sprite.png">
        <SubTexture name="tile.png" x="0" y="0" width="10" height="10"/>
      </TextureAtlas>
    `,
  };
  mockReadItemData.mockImplementation(async (projectName: string, itemPath: string) => {
    if (!mockData[itemPath]) {
      throw `No mock data for path ${itemPath}`;
    }
    return Promise.resolve(mockData[itemPath]);
  });
  mockBuildProject.mockResolvedValue("test/mock/game.ts");

  projectItems = [
    { path: "directory", children: [] },
    { path: "LoadScene.json" },
    { path: "System.ts" },
    { path: "UI.png" },
    { path: "sheet.xml" },
    { path: "sprite.png" },
  ];
  projectItems[0].children = [
    { path: "directory/OldScene.json" },
  ];

  project = new Project(backend, "Project Name");
  await project.inflateItems(projectItems);
  mockOpenProject.mockReturnValue(Promise.resolve(project));
  project.loadGameClass = mockLoadGameClass;
});

afterEach(() => {
  cleanup.forEach(c => c());
  cleanup.length = 0;
  sessionStorage.clear();
  mockOpenProject.mockReset();
  mockBuildProject.mockReset();
  mockLoadGameClass.mockReset();
  mockGetState.mockReset();
  mockSetState.mockReset();
  MockedGame.mockReset();
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
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    const modal = wrapper.getComponent({ ref: 'projectDialog' });
    expect(modal).toBeDefined();
    expect(modal.props('show')).toBeTruthy();
  });

  describe('loading project code', () => {
    test('builds and loads game class', async () => {
      const wrapper = mount(App, {
        attachTo: document.body,
        props: { backend },
      });
      await flushPromises();
      await wrapper.vm.$nextTick();

      const modal = wrapper.getComponent(ProjectSelect);
      modal.vm.$emit('select', project.name);
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(mockOpenProject).toHaveBeenCalledWith(project.name);
      expect(wrapper.vm.project.name).toBe(project.name);

      expect(mockLoadGameClass).toHaveBeenCalled();
    });

    test('loads system and component forms', async () => {
      // @ts-ignore
      mockLoadGameClass.mockResolvedValue(MockedGame);
      MockedGame.mockImplementation(() => {
        const game = new MockGameConstructor();
        game.components = {
          TestComponent: { editorComponent: 'test/mock/componentEditForm.vue' },
        };
        game.systems = {
          TestSystem: { editorComponent: 'test/mock/systemEditForm.vue' },
        };
        return jest.mocked(game);
      });
      const mockFetch = jest.spyOn(global, "fetch");
      // @ts-ignore
      mockFetch.mockImplementationOnce(() => {
        return Promise.resolve({
          ok: true,
          text: () => '',
        });
      });
      // @ts-ignore
      mockFetch.mockImplementationOnce(() => {
        return Promise.resolve({
          ok: true,
          text: () => '',
        });
      });

      const wrapper = mount(App, {
        attachTo: document.body,
        props: { backend },
      });
      await flushPromises();
      await wrapper.vm.$nextTick();

      const modal = wrapper.getComponent(ProjectSelect);
      modal.vm.$emit('select', project.name);
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0]).toEqual(['bfile://Project Name/test/mock/componentEditForm.vue']);
      expect(mockFetch.mock.calls[1]).toEqual(['bfile://Project Name/test/mock/systemEditForm.vue']);
    });
  });

  describe('can open items from project tree', () => {
    let wrapper: VueWrapper;
    beforeEach(async () => {
      wrapper = mount(App, {
        attachTo: document.body,
        props: { backend },
        global: {
          stubs: {
            SceneEdit: true,
            Release: true,
          },
        },
      });
      cleanup.push(wrapper.unmount.bind(wrapper));
      await flushPromises();
      await wrapper.vm.$nextTick();

      const modal = wrapper.getComponent(ProjectSelect);
      modal.vm.$emit('select', project.name);
      await flushPromises();
      await wrapper.vm.$nextTick();
    });

    test('can open scene from root', async () => {
      // Double-click an item in the project tree
      const assetTree = await findAsset(wrapper, 'LoadScene.json');
      assetTree.vm.ondblclick(assetTree.props('node'));
      await flushPromises();
      await wrapper.vm.$nextTick();

      // Opens tab w/ correct info
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll('a');
      expect(tabElements).toHaveLength(1);
      expect(tabElements[0].text()).toBe("LoadScene");
      expect(tabElements[0].attributes('aria-current')).toBe('true');

      // Shows current tab
      const editorTab = wrapper.getComponent(SceneEdit);
      expect(editorTab.vm.modelValue).toBeInstanceOf(Tab);
      expect(editorTab.vm.modelValue).toMatchObject({
        src: "LoadScene.json",
      });

      // XXX: Saves session info
      // Saves state info
      expect(mockSetState).toHaveBeenCalled();
      expect(mockSetState.mock.lastCall?.[0]).toBe("app");
      expect(mockSetState.mock.lastCall?.[1]).toMatchObject({ currentTabIndex: 0 });
    });

    test('can open scene from directory', async () => {
      // Double-click an item in the project tree
      const assetTree = await findAsset(wrapper, 'directory/OldScene.json');
      assetTree.vm.ondblclick(assetTree.props('node'));
      await flushPromises();
      await wrapper.vm.$nextTick();

      // Opens tab w/ correct info
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll('a');
      expect(tabElements).toHaveLength(1);
      expect(tabElements[0].text()).toBe("OldScene");
      expect(tabElements[0].attributes('aria-current')).toBe('true');

      // Shows current tab
      const editorTab = wrapper.getComponent(SceneEdit);
      expect(editorTab.vm.modelValue).toBeInstanceOf(Tab);
      expect(editorTab.vm.modelValue).toMatchObject({
        src: "directory/OldScene.json",
      });

      // XXX: Saves session info
      // Saves state info
      expect(mockSetState.mock.lastCall?.[0]).toBe("app");
      expect(mockSetState.mock.lastCall?.[1]).toMatchObject({ currentTabIndex: 0 });
    });

    test('can open code', async () => {
      // Electron shell.openPath returns "" on success
      const mockOpenEditor = jest.spyOn(global.electron, 'openEditor').mockResolvedValue("");
      // Double-click an item in the project tree
      const assetPath = 'System.ts';
      const assetTree = await findAsset(wrapper, assetPath);
      assetTree.vm.ondblclick(assetTree.props('node'));
      await flushPromises();
      await wrapper.vm.$nextTick();

      // Tries to open editor
      expect(mockOpenEditor).toHaveBeenCalledWith(project.name, assetPath);

      // Does not open tab
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll('a');
      expect(tabElements).toHaveLength(0);
    });

    test('can open game config', async () => {
      const configButton = wrapper.get('[data-test=game-config]');
      await configButton.trigger('click');
      await flushPromises();
      await wrapper.vm.$nextTick();

      // Opens tab w/ correct info
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll('a');
      expect(tabElements).toHaveLength(1);
      expect(tabElements[0].text()).toBe("Game Config");
      expect(tabElements[0].attributes('aria-current')).toBe('true');

      // XXX: Saves session info
      // Saves state info
      expect(mockSetState).toHaveBeenCalled();
      expect(mockSetState.mock.lastCall?.[0]).toBe("app");
      expect(mockSetState.mock.lastCall?.[1]).toMatchObject({ currentTabIndex: 0 });
    });

    test('can open release tab', async () => {
      const configButton = wrapper.get('[data-test=release]');
      await configButton.trigger('click');
      await flushPromises();
      await wrapper.vm.$nextTick();

      // Opens tab w/ correct info
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll('a');
      expect(tabElements).toHaveLength(1);
      expect(tabElements[0].text()).toBe("Release");
      expect(tabElements[0].attributes('aria-current')).toBe('true');

      // XXX: Saves session info
      // Saves state info
      expect(mockSetState).toHaveBeenCalled();
      expect(mockSetState.mock.lastCall?.[0]).toBe("app");
      expect(mockSetState.mock.lastCall?.[1]).toMatchObject({ currentTabIndex: 0 });
    });

    test('can open image viewer', async () => {
      const assetTree = await findAsset(wrapper, 'UI.png');
      assetTree.vm.ondblclick(assetTree.props('node'));
      await flushPromises();
      await wrapper.vm.$nextTick();

      // Opens tab w/ correct info
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll('a');
      expect(tabElements).toHaveLength(1);
      expect(tabElements[0].text()).toBe("UI");
      expect(tabElements[0].attributes('aria-current')).toBe('true');

      const viewerTab = wrapper.getComponent(ImageView);
      expect(viewerTab.vm.modelValue).toBeInstanceOf(Tab);
      expect(viewerTab.vm.modelValue).toMatchObject({
        src: "UI.png",
      });

      // XXX: Saves session info
      // Saves state info
      expect(mockSetState).toHaveBeenCalled();
      expect(mockSetState.mock.lastCall?.[0]).toBe("app");
      expect(mockSetState.mock.lastCall?.[1]).toMatchObject({ currentTabIndex: 0 });
    });

    test('can open sprite from sprite sheet', async () => {
      const assetTree = await findAsset(wrapper, 'sheet.xml/tile.png');
      assetTree.vm.ondblclick(assetTree.props('node'));
      await flushPromises();
      await wrapper.vm.$nextTick();

      // Opens tab w/ correct info
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll('a');
      expect(tabElements).toHaveLength(1);
      expect(tabElements[0].text()).toBe("tile");
      expect(tabElements[0].attributes('aria-current')).toBe('true');

      const viewerTab = wrapper.getComponent(ImageView);
      expect(viewerTab.vm.modelValue).toBeInstanceOf(Tab);
      expect(viewerTab.vm.modelValue).toMatchObject({
        src: "sheet.xml/tile.png",
      });

      // XXX: Saves session info
      // Saves state info
      expect(mockSetState).toHaveBeenCalled();
      expect(mockSetState.mock.lastCall?.[0]).toBe("app");
      expect(mockSetState.mock.lastCall?.[1]).toMatchObject({ currentTabIndex: 0 });
    });
  });

  describe('load session state (browser refresh)', () => {
    test('loads project', async () => {
      sessionStorage.setItem('currentProject', project.name);

      const wrapper = mount(App, {
        attachTo: document.body,
        props: { backend },
        global: {
          stubs: {
            SceneEdit: true,
          },
        },
      });
      cleanup.push(wrapper.unmount.bind(wrapper));
      await flushPromises();
      await wrapper.vm.$nextTick();

      const projectDialog = wrapper.getComponent<typeof Modal>({ ref: 'projectDialog' });
      expect(projectDialog.props('show')).toBe(false);
      expect(mockOpenProject).toHaveBeenCalledWith(project.name);
    });

    test('loads open tabs', async () => {
      const tabs = [
        { component: 'SceneEdit', path: 'LoadScene.json' },
        // { component: 'Release', path: 'bitwise.json' },
      ];
      sessionStorage.setItem('currentProject', project.name);
      sessionStorage.setItem('openTabs', JSON.stringify(tabs));

      const wrapper = mount(App, {
        attachTo: document.body,
        props: { backend },
        global: {
          stubs: {
            SceneEdit: true,
          },
        },
      });
      cleanup.push(wrapper.unmount.bind(wrapper));
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.gameClass).not.toBeNull();

      // Opens tab w/ correct info
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll('a');
      expect(tabElements).toHaveLength(1);
      expect(tabElements[0].text()).toBe("LoadScene");
      expect(tabElements[0].attributes('aria-current')).toBe('true');

      // Shows current tab
      const editorTab = wrapper.getComponent(SceneEdit);
      expect(editorTab.vm.modelValue).toBeInstanceOf(Tab);
      expect(editorTab.vm.modelValue).toMatchObject({
        src: "LoadScene.json",
      });
    });
  });

  describe('load stored state (resume project)', () => {
    test('loads project', async () => {
      mockGetState.mockResolvedValue({
        currentProject: project.name,
      });

      const wrapper = mount(App, {
        attachTo: document.body,
        props: { backend },
        global: {
          stubs: {
            SceneEdit: true,
          },
        },
      });
      cleanup.push(wrapper.unmount.bind(wrapper));
      await flushPromises();
      await wrapper.vm.$nextTick();

      const projectDialog = wrapper.getComponent<typeof Modal>({ ref: 'projectDialog' });
      expect(projectDialog.props('show')).toBe(true);
      expect(mockOpenProject).not.toHaveBeenCalled();

      const modal = wrapper.getComponent(ProjectSelect);
      modal.vm.$emit('restore');
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(projectDialog.props('show')).toBe(false);
      expect(mockOpenProject).toHaveBeenCalledWith(project.name);
      expect(wrapper.vm.gameClass).not.toBeNull();
    });

    test('restores tabs', async () => {
      const tabs = [
        { component: 'SceneEdit', path: 'LoadScene.json' },
        // { component: 'Release', path: 'bitwise.json' },
      ];
      mockGetState.mockResolvedValue({
        currentProject: project.name,
        openTabs: tabs,
        currentTabIndex: 0,
      });

      const wrapper = mount(App, {
        attachTo: document.body,
        props: { backend },
        global: {
          stubs: {
            SceneEdit: true,
          },
        },
      });
      cleanup.push(wrapper.unmount.bind(wrapper));
      await flushPromises();
      await wrapper.vm.$nextTick();

      const modal = wrapper.getComponent(ProjectSelect);
      const resumeButton = modal.get('[data-test=resumeProject]');
      expect(resumeButton.text()).toBe(`Resume ${project.name}`);
      await resumeButton.trigger('click');
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.gameClass).not.toBeNull();

      // Opens tab w/ correct info
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll('a');
      expect(tabElements).toHaveLength(1);
      expect(tabElements[0].text()).toBe("LoadScene");
      expect(tabElements[0].attributes('aria-current')).toBe('true');

      // Shows current tab
      const editorTab = wrapper.getComponent(SceneEdit);
      expect(editorTab.vm.modelValue).toBeInstanceOf(Tab);
      expect(editorTab.vm.modelValue).toMatchObject({
        src: "LoadScene.json",
      });
    });
  });

  describe('can import files from local filesystem', () => {
    const mockImportFiles = jest.fn() as jest.MockedFunction<typeof electron.importFiles>;
    beforeEach(() => {
      mockImportFiles.mockReset();
      electron.importFiles = mockImportFiles;
    });

    test('electron import function is called', async () => {
      mockImportFiles.mockResolvedValue(
        ["/imported/file.png"],
      );
      const wrapper = mount(App, {
        attachTo: document.body,
        props: { backend },
      });
      cleanup.push(wrapper.unmount.bind(wrapper));
      await flushPromises();
      await wrapper.vm.$nextTick();

      const importButton = wrapper.get('[data-test=import-files]');
      await importButton.trigger('click');
      expect(mockImportFiles).toHaveBeenCalled();
    });

  });
});

