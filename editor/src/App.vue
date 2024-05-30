<script lang="ts">
import * as bootstrap from "bootstrap";
import * as Vue from "vue";
import { loadModule } from 'vue3-sfc-loader';
import type { Asset, Component, Game, System } from '@fourstar/bitwise';
import Tab from './model/Tab.js';
import Project from './model/Project.js';
import NewTab from "./components/NewTab.vue";
import AssetTree from "./components/AssetTree.vue";
import ProjectSelect from "./components/ProjectSelect.vue";
import ImageView from "./components/ImageView.vue";
import MarkdownView from "./components/MarkdownView.vue";
import SceneEdit from "./components/SceneEdit.vue";
import GameConfig from "./components/GameConfig.vue";
import Modal from "./components/Modal.vue";
import MenuButton from "./components/MenuButton.vue";
import Release from "./components/Release.vue";
import PrefabEdit from "./components/PrefabEdit.vue";
import type { VueElement } from "vue";

// Core Component Forms
import TransformEdit from './components/bitwise/Transform.vue';
import OrthographicCameraEdit from './components/bitwise/OrthographicCamera.vue';
import SpriteEdit from './components/bitwise/Sprite.vue';
import RigidBodyEdit from './components/bitwise/RigidBody.vue';
import BoxColliderEdit from './components/bitwise/BoxCollider.vue';
import UIElementEdit from './components/bitwise/UIElement.vue';
import UIImageEdit from './components/bitwise/UIImage.vue';
import UITextEdit from './components/bitwise/UIText.vue';
import UIButtonEdit from './components/bitwise/UIButton.vue';
import UIContainerEdit from './components/bitwise/UIContainer.vue';

// Core System forms
import PhysicsEdit from './components/bitwise/system/Physics.vue';

type AppState = {
  currentProject: string,
  openTabs: Array<{ path: string, component: string }>,
  currentTabIndex: number,
};

const templates: { [key: string]: (name: string) => string } = {
  'Component.ts': (name: string): string => {
    return `
import * as bitecs from 'bitecs';
import { Component } from '@fourstar/bitwise';

export default class ${name} extends Component {
  get componentData() {
    return {
      // fieldName: bitecs.Types.f32
    };
  }

  declare store: {
    // fieldName: number[],
  }

  static get editorComponent():string {
    // Path to the .vue component, if any
    return '';
  }
}
`;
  },
  'System.ts': (name: string): string => {
    return `
import * as three from 'three';
import * as bitecs from 'bitecs';
import { Scene, System } from '@fourstar/bitwise';

export default class ${name} extends System {
  init() {
    // Get references to Components and Systems from this.scene
    // Create queries with bitecs.Query
    // Add event handlers
  }

  update( timeMilli:number ) {
    // Perform updates
  }

  static get editorComponent():string {
    // Path to the .vue component, if any
    return '';
  }
}
`;
  },
  'Component.vue': (name: string): string => {
    return '<scr' + `ipt lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: ['modelValue', 'scene'],
  data() {
    return {
      ...this.modelValue,
    };
  },
  methods: {
    update() {
      this.$emit( 'update:modelValue', this.$data );
      this.$emit( 'update', this.$data );
    },
  },
});
</scr` + `ipt>
<template>
  <div>
  </div>
</template>
<style>
</style>
`;
  },
};

const vueLoaderOptions = {
  moduleCache: {
    vue: Vue,
  },
  async getFile(url: string) {
    const res = await fetch(url);
    if (!res.ok) {
      throw Object.assign(new Error(res.statusText + ' ' + url), { res });
    }
    return {
      getContentData: (asBinary: boolean) => asBinary ? res.arrayBuffer() : res.text(),
    }
  },
  addStyle(textContent: string) {
    const style = Object.assign(document.createElement('style'), { textContent });
    const ref = document.head.getElementsByTagName('style')[0] || null;
    document.head.insertBefore(style, ref);
  },
};

export default Vue.defineComponent({
  components: {
    NewTab,
    AssetTree,
    ProjectSelect,
    ImageView,
    MarkdownView,
    SceneEdit,
    GameConfig,
    PrefabEdit,
    Modal,
    MenuButton,
    Release,
  },
  props: ['backend'],
  data() {
    return {
      platform: "",
      currentTabIndex: 0,
      openTabs: [] as Tab[],
      assets: [] as Asset[],
      gameFile: '',
      isBuilding: false,
      components: {} as { [key: string]: typeof Component },
      systems: {} as { [key: string]: typeof System },
      componentForms: Vue.markRaw({
        "Transform": TransformEdit,
        "OrthographicCamera": OrthographicCameraEdit,
        "Sprite": SpriteEdit,
        "RigidBody": RigidBodyEdit,
        "BoxCollider": BoxColliderEdit,
        "UIElement": UIElementEdit,
        "UIImage": UIImageEdit,
        "UIText": UITextEdit,
        "UIButton": UIButtonEdit,
        "UIContainer": UIContainerEdit,
      }) as { [key: string]: typeof VueElement },
      systemForms: Vue.markRaw({
        "Physics": PhysicsEdit,
      }) as { [key: string]: typeof VueElement },
      consoleLogs: [],
      openConsole: false,
      consoleErrors: 0,
      consoleWarnings: 0,
      project: new Project(Vue.toRaw(this.backend), ''),
      icons: {
        SceneEdit: 'fa-film',
        TilesetEdit: 'fa-grid-2-plus',
        PrefabEdit: 'fa-cubes',
      },
    };
  },
  provide() {
    return {
      backend: this.backend,
      project: Vue.computed(() => this.project),
      isBuilding: Vue.computed(() => this.isBuilding),
      baseUrl: Vue.computed(() => this.baseUrl),
      systemForms: Vue.computed(() => this.systemForms),
      componentForms: Vue.computed(() => this.componentForms),
      assets: Vue.computed(() => this.assets),
      openTab: (tab: Tab) => this.openTab(tab),
    };
  },
  watch: {
    'project.gameClass': function () {
      console.log(`App.vue got new gameClass`);
    },
  },
  computed: {
    isMac(): boolean {
      return this.platform === "darwin";
    },
    baseUrl(): string {
      return `bfile://${this.project.name}/`;
    },
    currentTab(): Tab {
      return this.openTabs[this.currentTabIndex];
    },
    hasSessionState(): boolean {
      return !!sessionStorage.getItem('currentProject');
    },
    appState(): AppState {
      return Vue.toRaw({
        currentProject: this.project.name,
        openTabs: this.openTabs.map(t => ({ component: t.component, path: t.src })),
        currentTabIndex: this.currentTabIndex,
      });
    },
  },
  methods: {
    importFiles(): Promise<any> {
      // TODO: This should use the Backend to copy the files from the
      // local filesystem.
      return electron.importFiles(this.project.name);
    },

    saveSessionState(): void {
      if (!this.project) {
        return;
      }
      const { currentProject, openTabs, currentTabIndex } = this.appState;
      sessionStorage.setItem('currentProject', currentProject);
      sessionStorage.setItem('openTabs', JSON.stringify(openTabs, null, 2));
      sessionStorage.setItem('currentTabIndex', currentTabIndex.toString());
    },

    async loadSessionState(): Promise<void> {
      const currentProject = sessionStorage.getItem('currentProject') || '';
      // Fetch tab info before we open the project. Opening the project
      // will reset the app tabs, so we have to set them after opening.
      const openTabs = sessionStorage.getItem('openTabs') || "[]";
      const currentTabIndex = sessionStorage.getItem('currentTabIndex') || "0";

      if (!currentProject) {
        return;
      }
      await this.restoreState({
        currentProject,
        openTabs: JSON.parse(openTabs),
        currentTabIndex: parseInt(currentTabIndex),
      });
    },

    async restoreState(appState: AppState) {
      await this.openProject(appState.currentProject);
      for (const tab of appState.openTabs || []) {
        this.openTab(tab);
      }
      if ("currentTabIndex" in appState) {
        this.showTab(appState.currentTabIndex);
      }
    },

    async openProject(name: string) {
      this.project = await this.backend.openProject(name);
      this.assets = this.project.assets;
      this.buildProject();
    },

    saveStoredState() {
      this.backend.setState('app', this.appState);
    },

    async loadStoredState(): Promise<void> {
      const state = await this.backend.getState('app', {});
      if (!state.currentProject) {
        return;
      }
      await this.restoreState(state);
    },

    updateTab(tabUpdate: Object) {
      Object.assign(this.currentTab, tabUpdate);
    },

    showTab(index: number) {
      this.currentTabIndex = index;
      this.saveSessionState();
      this.saveStoredState();
    },

    async load(projectName: string) {
      this.$refs['projectDialog'].close();
      await this.openProject(projectName);
      this.saveSessionState();
      this.saveStoredState();
    },

    newTab(name: string, component) {
      // New tab creates a new project item and then a tab to go with it
      const tab = {
        name,
        component,
        icon: this.icons[component],
        ext: '.json',
        data: {},
        edited: true,
      };
      this.openTabs.push(tab);
      this.showTab(this.openTabs.length - 1);
      this.saveSessionState();
      this.saveStoredState();
    },

    async newModule(name: string, templateName: string) {
      const ext = templateName.substring(templateName.lastIndexOf('.') + 1);
      return electron.newFile(this.project.name, name, ext)
        .then(async res => {
          if (!res.canceled) {
            const path = res.filePath.replace(this.project.name, '');
            const fileName = path.split('/').pop();
            if (!fileName) {
              return;
            }
            const name = fileName.substring(0, fileName.indexOf('.'));
            const template = templates[templateName](name);
            await electron.saveFile(this.project.name, path, template);
            this.openEditor({ path });
          }
        });
    },

    findAsset(findPath: string): Asset | void {
      const findParts = findPath.split('/');
      let items = this.assets;
      for (let i = 0; i < findParts.length; i++) {
        const itemPath = findParts.slice(0, i + 1).join('/');
        const item = items.find(item => item.path === itemPath);
        if (!item) {
          return;
        }
        if (item.path === findPath) {
          return item;
        }
        if (!item.children?.length) {
          throw `Could not find project item "${findPath}"`;
        }
        items = item.children;
      }
    },

    openEditor(item: { path: string }) {
      return electron.openEditor(this.project.name, item.path);
    },

    async openTab(item: Asset) {
      if (!item.component && item.path.match(/\.([tj]s)$/)) {
        this.openEditor(item);
        return;
      }

      const asset = this.findAsset(item.path);
      if (!asset) {
        throw `Cannot find asset ${item.path}`;
      }
      const tab = new Tab(this.project, asset);
      if (item.component) {
        tab.component = item.component;
        tab.icon = this.icons[item.component];
      }
      else {
        // Determine what kind of component to use
        const ext = tab.ext;
        if (ext === '.json') {
          // JSON files are game objects
          tab.component = asset.data.component;
          tab.icon = this.icons[asset.data.component];
        }
        else if (ext.match(/\.(png|gif|jpe?g)$/)) {
          tab.component = "ImageView";
          tab.icon = 'fa-image';
        }
        else if (ext.match(/\.(md|markdown)$/)) {
          tab.component = "MarkdownView";
          tab.icon = 'fa-file-lines';
        }
      }

      this.openTabs.push(tab);
      this.showTab(this.openTabs.length - 1);
    },

    closeTab(i: number) {
      const tab = this.openTabs[i];
      if (tab.edited) {
        const okay = confirm("Unsaved changes will be lost. Close tab?");
        if (!okay) {
          return;
        }
      }

      for (let i = 0; i < this.openTabs.length; i++) {
        if (this.openTabs[i] === tab) {
          this.openTabs.splice(i, 1);
          if (this.currentTabIndex >= this.openTabs.length) {
            this.showTab(this.openTabs.length - 1);
          }
          break;
        }
      }

      this.saveSessionState();
      this.saveStoredState();
    },

    showFileDropdown(event: MouseEvent) {
      if (this._showingDropdown) {
        this._showingDropdown.hide();
      }
      const el = event.target.closest('.dropdown');
      if (!el) {
        console.error(".dropdown not found for ", event.target);
      }
      const dropdown = bootstrap.Dropdown.getInstance(el.querySelector('[data-bs-toggle]'));
      dropdown.show();
      this._showingDropdown = dropdown;
    },

    hideFileDropdown(event: MouseEvent) {
      const el = event.target.closest('.dropdown');
      if (!el) {
        console.error(".dropdown not found for ", event.target);
      }
      const dropdown = bootstrap.Dropdown.getInstance(el.querySelector('[data-bs-toggle]'));
      if (!dropdown) {
        return;
      }
      dropdown.hide();
      this._showingDropdown = null;
    },

    showGameConfigTab() {
      const tab = {
        name: "Game Config",
        component: "GameConfig",
        ext: 'json',
        icon: 'fa-gear',
        src: 'bitwise.json',
        edited: false,
      };
      this.openTabs.push(tab);
      this.showTab(this.openTabs.length - 1);
    },

    showReleaseTab() {
      const tab = {
        name: "Release",
        component: "Release",
        icon: 'fa-file-export',
        src: 'bitwise.json',
        ext: 'json',
        edited: false,
      };
      this.openTabs.push(tab);
      this.showTab(this.openTabs.length - 1);
    },

    toggleConsole() {
      this.openConsole = this.openConsole ? false : true;
      if (this.openConsole === false) {
        this.consoleErrors = 0;
        this.consoleWarnings = 0;
      }
    },

    handleKeydown(event: KeyboardEvent) {
      // For MacOS, handle Cmd+*, for everything else, Ctrl+*
      if ((this.isMac && event.metaKey) || (!this.isMac && event.ctrlKey)) {
        switch (event.key) {
          case "x":
            this.$refs['currentTab'].oncut?.(event);
            return;
          case "c":
            this.$refs['currentTab'].oncopy?.(event);
            return;
          case "v":
            this.$refs['currentTab'].onpaste?.(event);
            return;
        }
      }
      else {
        switch (event.key) {
          case "Backspace":
          case "Delete":
            this.$refs['currentTab'].ondelete?.(event);
            return;
        }
      }
    },

    async buildProject() {
      const gameClass = await this.project.loadGameClass() as typeof Game;

      if (gameClass) {
        try {
          const game = new gameClass({});
          this.components = game.components;
          this.systems = game.systems;
        }
        catch (e) {
          console.log(`Could not create new game: ${e}`);
          return;
        }

        for (const name in this.components) {
          const component = this.components[name];
          if (component.editorComponent) {
            const path = this.baseUrl + component.editorComponent;
            this.componentForms[name] = await loadModule(path, vueLoaderOptions);
          }
        }

        for (const name in this.systems) {
          const system = this.systems[name];
          if (system.editorComponent) {
            const path = this.baseUrl + system.editorComponent;
            this.systemForms[name] = await loadModule(path, vueLoaderOptions);
          }
        }
      }

      this.isBuilding = false;
    },

  },

  async mounted() {
    this.platform = await electron.platform();
    if (this.hasSessionState) {
      await this.loadSessionState();
    }
    electron.on('error', (ev, err) => {
      console.trace(ev, err);
    });
    electron.on('info', (ev, msg) => console.log(msg));

    window.addEventListener('keydown', this.handleKeydown.bind(this));
  },
});
</script>

<template>
  <div class="app-container">
    <Modal ref="projectDialog" id="projectDialog" title="Welcome to Bitwise" :show="!(project?.name)">
      <ProjectSelect @select="load" @restore="loadStoredState" data-test="project-select" />
    </Modal>

    <div class="app-sidebar">
      <div class="d-flex justify-content-between">
        <div class="d-flex">
          <MenuButton class="me-1" title="New">
            <template #title>
              <i class="fa fa-file-circle-plus"></i>
            </template>
            <ul>
              <li @click="newTab('New Scene', 'SceneEdit')">Scene</li>
              <li class="hr">
                <hr>
              </li>
              <li @click="newModule('NewComponent', 'Component.ts')">Component</li>
              <li @click="newModule('NewComponentForm', 'Component.vue')">Component Form</li>
              <li @click="newModule('NewSystem', 'System.ts')">System</li>
              <li @click="newModule('NewSystemForm', 'Component.vue')">System Form</li>
            </ul>
          </MenuButton>
          <button class="menu-button" title="Import" @click="importFiles" data-test="import-files">
            <i class="fa fa-file-import"></i>
          </button>
        </div>
        <MenuButton title="Project Menu">
          <template #title>
            <i class="fa fa-gear"></i>
          </template>
          <ul>
            <li data-test="game-config" @click="showGameConfigTab">Game Config</li>
            <li class="hr">
              <hr>
            </li>
            <li data-test="release" @click="showReleaseTab">Release...</li>
          </ul>
        </MenuButton>
      </div>
      <div data-testid="projectTree" ref="projectTree" class="app-sidebar-item">
        <AssetTree :ondblclick="openTab" :project="project" />
      </div>
    </div>

    <header class="app-tabbar">
      <nav ref="tabBar">
        <a v-for="tab, i in openTabs" href="#" @click.prevent="showTab(i)" :key="tab.src"
          :aria-current="i === currentTabIndex ? 'true' : ''">
          <i class="fa" :class="tab.icon"></i> {{ tab.name }}
          <i class="delete fa fa-circle-xmark" @click.prevent.stop="closeTab(i)"></i>
        </a>
      </nav>
    </header>

    <component class="app-main" v-if="currentTab" ref="currentTab" :is="currentTab.component" :key="currentTab.src"
      v-model="currentTab" @update="updateTab" />

    <div class="console" :style="openConsole ? 'top: -50vh' : ''">
      <div class="console-top">
        <span @click="toggleConsole">Console</span>
        <span class="console-info">
          <span v-if="consoleErrors > 0"><i class="fa fa-hexagon-xmark"></i>{{ consoleErrors || 0 }}</span>
          <span v-if="consoleWarnings > 0"><i class="fa fa-triangle-exclamation"></i>{{ consoleWarnings || 0 }}</span>
        </span>
      </div>
      <div class="console-bottom">
        <p v-for="log in consoleLogs" :class="'log-' + log.level"><span v-for="msg in log.msg">{{ msg }}</span></p>
      </div>
    </div>
  </div>
</template>

<style>
html,
body,
#app {
  height: 100%
}

body {
  --bw-background-color: #2C373F;
  --bw-border-color: #445157;
  --bw-border-color-focus: #748187;
  --bw-color: #9CAEB4;
  --bw-color-disabled: #5C6E74;
  --bw-background-color-hover: #1613d4;
  --bw-background-color-primary: #0909ed;
  --bw-color-hover: #cccccc;
  --bw-box-shadow: 5px 5px 15px 5px #66666666;
  color: var(--bw-color);
  background: var(--bw-background-color);
}

h1,
h2,
h3,
h4,
h5,
h6 {
  color: var(--bw-color);
}

input,
select,
textarea {
  color: var(--bw-color);
  background: var(--bw-background-color);
  border-color: var(--bw-border-color);
  border-width: 1px;
  border-radius: 3px;
}

input:focus,
select:focus {
  color: var(--bw-color-hover);
  background: var(--bw-background-color-hover);
  border-color: var(--bw-border-color-focus);
  border-style: solid;
  outline: none;
}

button {
  border: 1px solid var(--bw-color);
  color: var(--bw-color);
  background: var(--bw-border-color);
  border-radius: 5px;
}

button.primary {
  background: var(--bw-background-color-primary);
}

.app-container {
  position: relative;
  height: 100%;
  overflow: hidden;
  display: grid;
  place-content: stretch;
  grid-template-rows: auto 1fr minmax(32px, auto);
  grid-template-columns: minmax(0, auto) 1fr;
  grid-template-areas: "sidebar tabbar" "sidebar main" "console console";
}

.console {
  position: absolute;
  grid-area: console;
  overflow: scroll;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bw-border-color);
  overflow: hidden;
  display: flex;
  flex-flow: column;
}

.console-top {
  height: 32px;
  padding: 0.25rem;
  display: flex;
  align-items: center;
}

.console-top .console-info {
  text-align: right;
  flex: 1 1 100%;
}

.console-bottom {
  overflow: scroll;
  max-height: 100%;
  background: var(--bw-background-color);
}

.console-bottom p {
  margin: 0;
  padding: 0.25rem;
  border-width: 0 0 1px 0;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.1);
}

.app-sidebar {
  /* XXX: Allow changing sidebar width */
  --sidebar-width: auto;
  grid-area: sidebar;
  width: 17vw;
  max-width: 17vw;
  transition: width 0.2s;
  display: flex;
  flex-flow: column;
  background: var(--bw-border-color);
  padding: 0.3em;
}

.app-sidebar-item {
  background: var(--bw-background-color);
  color: var(--bw-color);
  margin: 0.3em 0;
  overflow-y: scroll;
}

.app-main {
  grid-area: main;
}

.app-tabbar {
  grid-area: tabbar;
  background: var(--bw-background-color);
  padding: 0.2em;
}

.app-tabbar nav {
  margin: 0;
  padding: 0;
  display: flex;
}

.app-tabbar nav :link {
  flex-basis: 20%;
  color: var(--bw-color);
  text-decoration: none;
  border: 1px solid var(--bw-border-color);
  background: var(--bw-border-color);
  padding: 0 0.2em;
  margin-right: 0.2em;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-tabbar nav :link[aria-current=true] {
  color: var(--bw-color-hover);
  background: var(--bw-background-color-hover);
  border-color: var(--bw-border-color-focus);
}

.app-tabbar nav :link i.delete {
  visibility: hidden;
}

.app-tabbar nav :link:hover i.delete {
  visibility: visible;
}

.project-tree-item-menu-button {
  display: inline-block;
  height: 100%;
  padding: 0 0.25em;
  font-size: 1.3em;
  vertical-align: middle;
}
</style>
