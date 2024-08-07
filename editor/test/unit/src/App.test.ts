import { describe, expect, test, beforeEach, afterEach, jest, beforeAll } from '@jest/globals';
import { flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { Game, Component, System } from '@fourstar/bitwise';
import { MockElectron } from '../../mock/electron.js';
import Backend from '../../../src/backend/Electron.js';
import App from '../../../src/App.vue';
import Tree from '../../../src/components/Tree.vue';
import SceneEdit from '../../../src/components/SceneEdit.vue';
import ImageView from '../../../src/components/ImageView.vue';
import type Modal from '../../../src/components/Modal.vue';
import ProjectSelect from '../../../src/components/ProjectSelect.vue';
import Tab from '../../../src/model/Tab.js';
import Project from '../../../src/model/Project.js';
import type { DirectoryItem } from '../../../src/Backend.js';

jest.mock('../../../src/backend/Electron.js');

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

let backend: jest.Mocked<Backend>;
let project: Project;
let projectItems: DirectoryItem[];
let mockImport: jest.Mock<Project["_import"]> = jest.fn();
const cleanup = [] as Array<() => void>;
beforeEach(async () => {
  global.electron = new MockElectron();
  global.fetch = jest.fn() as jest.MockedFunction<typeof global.fetch>

  backend = jest.mocked(new Backend());
  backend.getState.mockResolvedValue({});
  const backendListeners: {
    [key: string | symbol]: Function[],
  } = {};
  backend.on.mockImplementation((name: string, cb: Function) => {
    backendListeners[name] ||= [];
    backendListeners[name].push(cb);
    return backend;
  });
  backend.emit.mockImplementation((name, ...args) => {
    if (name in backendListeners) {
      backendListeners[name].forEach(cb => cb(...args));
    }
    return true;
  });

  const mockData: { [key: string]: string } = {
    'bitwise.json': '{"game": {}}',
    'LoadScene.json': '{ "type": "Scene", "component": "SceneEdit" }',
    'directory/OldScene.json': '{ "type": "Scene", "component": "SceneEdit" }',
    'sheet.xml': `<?xml version="1.0" encoding="UTF-8"?>
      <TextureAtlas imagePath="sprite.png">
        <SubTexture name="tile.png" x="0" y="0" width="10" height="10"/>
      </TextureAtlas>
    `,
  };
  backend.readItemData.mockImplementation(async (projectName: string, itemPath: string) => {
    if (!mockData[itemPath]) {
      throw `No mock data for path ${itemPath}`;
    }
    return Promise.resolve(mockData[itemPath]);
  });
  backend.buildProject.mockResolvedValue("../mock/game.ts");

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
  backend.listItems.mockResolvedValue(projectItems);
  backend.listProjects.mockResolvedValue([]);

  mockImport.mockReset();
  project = new Project(backend, "Project Name");
  project._import = mockImport;
  backend.openProject.mockResolvedValue(project);
});

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {
      // do nothing
    }
    unobserve() {
      // do nothing
    }
    disconnect() {
      // do nothing
    }
  };
  jest.spyOn(document, 'hasFocus').mockReturnValue(true);
});

afterEach(async () => {
  cleanup.forEach(c => c());
  cleanup.length = 0;
  sessionStorage.clear();
  await flushPromises();
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

      expect(backend.openProject).toHaveBeenCalledWith(project.name);
      expect(wrapper.vm.project.name).toBe(project.name);

      expect(backend.buildProject).toHaveBeenCalled();
    });

    test('watches project build events', async () => {
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

      project.emit('loadstart');
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.isBuilding).toBeTruthy();
      expect(wrapper.get('.tasks').text()).toContain('Building');

      project.emit('loadend');
      await flushPromises();
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.isBuilding).toBeFalsy();
      expect(wrapper.get('.tasks').text()).not.toContain('Building');
    });

    test('loads system and component forms', async () => {
      // @ts-ignore
      project._import.mockResolvedValue(class MockGame extends Game {
        constructor() {
          super({});
          console.log('constructing mock game');
          this.components = {
            TestComponent: class extends Component {
              static editorComponent = 'test/mock/componentEditForm.vue'
            },
          };
          this.systems = {
            TestSystem: class extends System {
              static editorComponent = 'test/mock/systemEditForm.vue'
            },
          };
        }
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

  describe('displays asset tree', () => {
    let wrapper: VueWrapper;
    beforeEach(async () => {
      wrapper = mount(App, {
        attachTo: document.body,
        props: { backend },
      });
      cleanup.push(wrapper.unmount.bind(wrapper));
      await flushPromises();
      await wrapper.vm.$nextTick();

      const modal = wrapper.getComponent(ProjectSelect);
      modal.vm.$emit('select', project.name);
      await flushPromises();
      await wrapper.vm.$nextTick();
    });

    test('shows new assets after change', async () => {
      const newItems = [{ path: 'newimage.png' }];
      projectItems.push(...newItems);
      backend.listItems.mockReset();
      backend.listItems.mockResolvedValue(projectItems);
      backend.emit('change', newItems);
      await wrapper.vm.$nextTick();
      await flushPromises();
      await wrapper.vm.$nextTick();
      await flushPromises();

      console.log(wrapper.html());
      const treeItem = wrapper.find('[data-path="newimage.png"]');
      expect(treeItem.exists()).toBeTruthy();
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
      expect(backend.setState).toHaveBeenCalled();
      expect(backend.setState.mock.lastCall?.[0]).toBe("app");
      expect(backend.setState.mock.lastCall?.[1]).toMatchObject({ currentTabIndex: 0 });
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
      expect(backend.setState.mock.lastCall?.[0]).toBe("app");
      expect(backend.setState.mock.lastCall?.[1]).toMatchObject({ currentTabIndex: 0 });
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
      expect(backend.setState).toHaveBeenCalled();
      expect(backend.setState.mock.lastCall?.[0]).toBe("app");
      expect(backend.setState.mock.lastCall?.[1]).toMatchObject({ currentTabIndex: 0 });
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
      expect(backend.setState).toHaveBeenCalled();
      expect(backend.setState.mock.lastCall?.[0]).toBe("app");
      expect(backend.setState.mock.lastCall?.[1]).toMatchObject({ currentTabIndex: 0 });
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
      expect(backend.setState).toHaveBeenCalled();
      expect(backend.setState.mock.lastCall?.[0]).toBe("app");
      expect(backend.setState.mock.lastCall?.[1]).toMatchObject({ currentTabIndex: 0 });
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
      expect(backend.setState).toHaveBeenCalled();
      expect(backend.setState.mock.lastCall?.[0]).toBe("app");
      expect(backend.setState.mock.lastCall?.[1]).toMatchObject({ currentTabIndex: 0 });
    });
  });

  describe('can create new assets', () => {
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

    test('create a new Scene', async () => {
      await wrapper.get('[data-test=new-asset]').trigger('click');
      await wrapper.get('[data-test=new-scene]').trigger('click');
      await flushPromises();
      await wrapper.vm.$nextTick();

      // Opens tab w/ correct info
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll('a');
      expect(tabElements).toHaveLength(1);
      expect(tabElements[0].text()).toBe("");
      expect(tabElements[0].attributes('aria-current')).toBe('true');

      const editorTab = wrapper.getComponent(SceneEdit);
      expect(editorTab.vm.modelValue).toBeInstanceOf(Tab);
      expect(editorTab.vm.modelValue).toMatchObject({
        src: "",
      });
    });

    test('create new game component', async () => {
      const defaultComponentName = 'NewComponent';
      const defaultComponentExt = 'ts';
      const defaultComponentPath = `${defaultComponentName}.${defaultComponentExt}`;
      // Electron shell.openPath returns "" on success
      const mockOpenEditor = jest.spyOn(global.electron, 'openEditor').mockResolvedValue("");
      const mockNewFile = jest.spyOn(global.electron, 'newFile').mockResolvedValue({
        canceled: false,
        filePath: defaultComponentPath,
      });
      const mockSaveFile = jest.spyOn(global.electron, 'saveFile').mockResolvedValue();

      await wrapper.get('[data-test=new-asset]').trigger('click');
      await wrapper.get('[data-test=new-component]').trigger('click');
      await flushPromises();
      await wrapper.vm.$nextTick();

      // Tries to open editor
      expect(mockNewFile).toHaveBeenCalledWith(project.name, defaultComponentName, defaultComponentExt);
      expect(mockSaveFile).toHaveBeenCalledWith(project.name, defaultComponentPath, expect.stringMatching(`${defaultComponentName} extends Component`));
      expect(mockOpenEditor).toHaveBeenCalledWith(project.name, defaultComponentPath);

      // Does not open tab
      const tabBar = wrapper.get({ ref: 'tabBar' });
      const tabElements = tabBar.findAll('a');
      expect(tabElements).toHaveLength(0);
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
      expect(backend.openProject).toHaveBeenCalledWith(project.name);
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
      backend.getState.mockResolvedValue({
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
      expect(backend.openProject).not.toHaveBeenCalled();

      const modal = wrapper.getComponent(ProjectSelect);
      modal.vm.$emit('restore');
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(projectDialog.props('show')).toBe(false);
      expect(backend.openProject).toHaveBeenCalledWith(project.name);
    });

    test('restores tabs', async () => {
      const tabs = [
        { component: 'SceneEdit', path: 'LoadScene.json' },
        // { component: 'Release', path: 'bitwise.json' },
      ];
      backend.getState.mockResolvedValue({
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

