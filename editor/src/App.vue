<script lang="ts">
import * as bootstrap from "bootstrap";
import { defineComponent, markRaw, toRaw } from "vue";
import { mapStores, mapState, mapActions, mapGetters } from 'pinia';
import { useAppStore } from "./store/app.mts";
import NewTab from "./components/NewTab.vue";
import ObjectTree from "./components/ObjectTree.vue";
import ProjectSelect from "./components/ProjectSelect.vue";
import ImageView from "./components/ImageView.vue";
import MarkdownView from "./components/MarkdownView.vue";
import TilesetEdit from "./components/TilesetEdit.vue";
import SceneEdit from "./components/SceneEdit.vue";
import GameConfig from "./components/GameConfig.vue";
import Modal from "./components/Modal.vue";
import MenuButton from "./components/MenuButton.vue";
import Release from "./components/Release.vue";
import PrefabEdit from "./components/PrefabEdit.vue";

export default defineComponent({
  components: {
    NewTab,
    ObjectTree,
    ProjectSelect,
    ImageView,
    MarkdownView,
    TilesetEdit,
    SceneEdit,
    GameConfig,
    PrefabEdit,
    Modal,
    MenuButton,
    Release,
  },
  data() {
    return {
      consoleLogs: [],
      openConsole: false,
      consoleErrors: 0,
      consoleWarnings: 0,
    };
  },
  computed: {
    ...mapStores(useAppStore),
    ...mapState(useAppStore, ['currentProject', 'currentTabIndex', 'openTabs', 'projectItems']),
    ...mapGetters(useAppStore, ['hasSessionState']),
    currentTab() {
      return this.openTabs[ this.currentTabIndex ];
    },
  },
  methods: {
    ...mapActions(useAppStore, ['loadSessionState', 'importFiles']),
    updateTab(data:Object) {
      this.currentTab.data = data;
      this.currentTab.edited = true;
    },
    updateTabName(name:string) {
      this.currentTab.name = name;
      this.currentTab.edited = true;
    },
    showTab( index: number ) {
      this.appStore.showTab( index );
    },
    load() {
      this.$refs['projectDialog'].close();
    },

    newTab( name:string, component ) {
      this.appStore.openTab({
        name,
        component,
        icon: this.appStore.icons[component],
        ext: '.json',
        data: {},
        edited: true,
      });
    },

    newModule( name:string, template:string ) {
      this.appStore.newModuleFromTemplate( name, template );
    },

    async openTab( item ) {
      // Determine what kind of component to use
      const ext = item.ext;
      if ( ext === '.json' ) {
        // JSON files are game objects
        // Fetch the file to decide which tab component to use
        const fileContent = await this.appStore.readFile(item.path);
        const data = JSON.parse( fileContent );
        const tab = {
          name: item.name,
          ext,
          icon: this.appStore.icons[data.component],
          src: item.path,
          component: data.component,
          data: data,
          edited: false,
        };
        this.appStore.openTab(tab);
      }
      else if ( ext.match( /\.(png|gif|jpe?g)$/ ) ) {
        const tab = {
          name: item.name.replace( /\.(png|gif|jpe?g)$/, '' ),
          ext,
          icon: 'fa-image',
          src: item.path,
          component: "ImageView",
          data: item.path,
          edited: false,
        };
        this.appStore.openTab(tab);
      }
      else if ( ext.match( /\.(md|markdown)$/ ) ) {
        const tab = {
          name: item.name.replace( /\.(md|markdown)$/, '' ),
          ext,
          icon: 'fa-file-lines',
          src: item.path,
          component: "MarkdownView",
          data: await this.appStore.readFile(item.path),
          edited: false,
        };
        this.appStore.openTab(tab);
      }
      else if ( ext.match( /\.([tj]s)$/ ) ) {
        this.appStore.openEditor(item.path);
      }
    },

    closeTab( i:number ) {
      const tab = this.openTabs[ i ];
      if ( tab.edited ) {
        const okay = confirm("Unsaved changes will be lost. Close tab?");
        if ( !okay ) {
          return;
        }
      }
      this.appStore.closeTab( this.openTabs[i] );
    },

    async saveTab() {
      const tab = this.currentTab;
      tab.data.component = tab.component;
      // No src? Open save as dialog
      if ( !tab.src ) {
        await this.appStore.newFile(
          tab.name,
          'json',
          JSON.stringify( toRaw( tab.data ), null, 2 ),
        );
        return;
      }
      // Name changes? Write new file and delete old
      if ( tab.src != tab.name + tab.ext && !tab.src.endsWith('/' + tab.name + tab.ext) ) {
        const oldSrc = tab.src;
        const newSrc = oldSrc.replace( oldSrc.substring( oldSrc.lastIndexOf( '/' ) + 1 ), tab.name + tab.ext );
        try {
          await this.appStore.readFile( newSrc );
          // If we've got a file, the file exists.
          // Ask to overwrite
          if ( !confirm( `File ${newSrc} exists. Overwrite?` ) ) {
            return;
          }
        }
        catch (e) {
          // File does not exist, continue...
        }
        tab.src = newSrc;
        await this.appStore.saveFile( tab.src, JSON.stringify( tab.data, null, 2 ) );
        await this.appStore.deleteTree( oldSrc );
        return;
      }
      // Otherwise, just write the data!
      await this.appStore.saveFile(
        tab.src,
        JSON.stringify( tab.data, null, 2 ),
      );
    },

    showFileDropdown( event:MouseEvent ) {
      if ( this._showingDropdown ) {
        this._showingDropdown.hide();
      }
      const el = event.target.closest( '.dropdown' );
      if ( !el ) {
        console.error( ".dropdown not found for ", event.target );
      }
      const dropdown = bootstrap.Dropdown.getInstance( el.querySelector('[data-bs-toggle]') );
      dropdown.show();
      this._showingDropdown = dropdown;
    },

    hideFileDropdown( event:MouseEvent ) {
      const el = event.target.closest( '.dropdown' );
      if ( !el ) {
        console.error( ".dropdown not found for ", event.target );
      }
      const dropdown = bootstrap.Dropdown.getInstance(el.querySelector('[data-bs-toggle]'));
      if ( !dropdown ) {
        return;
      }
      dropdown.hide();
      this._showingDropdown = null;
    },

    deleteFile( item:Object ) {
      if ( confirm( `Are you sure you want to delete "${item.name}"?` ) ) {
        this.appStore.deleteTree( item.path );
      }
    },

    async showGameConfigTab() {
      this.appStore.openTab({
        name: "Game Config",
        component: "GameConfig",
        ext: 'json',
        icon: 'fa-gear',
        src: 'bitwise.json',
        data: toRaw(this.appStore.gameConfig),
        edited: false,
      });
    },

    showReleaseTab() {
      this.appStore.openTab({
        name: "Release",
        component: "Release",
        icon: 'fa-file-export',
        edited: false,
        src: 'bitwise.json',
        data: toRaw(this.appStore.gameConfig),
      });
    },

    toggleConsole() {
      this.openConsole = this.openConsole ? false : true;
      if ( this.openConsole === false ) {
        this.consoleErrors = 0;
        this.consoleWarnings = 0;
      }
    },

    onDropFile( event ) {
      const data = event.dataTransfer.getData("bitwise/file");
      if ( data ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        const dropPath = event.currentTarget.dataset.path;
        // If the destination is a file, move to the parent folder
        const parts = dropPath.split('/');
        let destItem = this.projectItems.find( item => item.name + item.ext === parts[0] );
        let parentPath = '';
        for ( const part of parts.slice(1) ) {
          parentPath += '/' + destItem.name;
          destItem = destItem.children.find( item => item.name === part );
        }
        let destination = destItem.isDirectory ? destItem.path : parentPath;
        destination += '/' + data.split('/').pop();
        this.appStore.renamePath( data, destination );
      }
      else {
        event.dataTransfer.dropEffect = "";
      }
    },

    handleKeydown( event:KeyboardEvent ) {
      // For MacOS, handle Cmd+*, for everything else, Ctrl+*
      if ( ( electron.isMac && event.metaKey ) || ( !electron.isMac && event.ctrlKey ) ) {
        switch ( event.key ) {
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
        switch ( event.key ) {
          case "Backspace":
          case "Delete":
            this.$refs['currentTab'].ondelete?.(event);
            return;
        }
      }
    },

  },
  async mounted() {
    if ( this.hasSessionState ) {
      await this.loadSessionState();
    }
    if ( !this.currentProject ) {
      this.$nextTick( () => this.$refs['projectDialog'].open() );
    }
    electron.on( 'error', (ev, err) => console.error(err) );
    electron.on( 'info', (ev, msg) => console.log(msg) );

    window.addEventListener( 'keydown', this.handleKeydown.bind(this) );
  },
});
</script>

<template>
  <div class="app-container">
    <Modal ref="projectDialog" id="projectDialog" title="Welcome to Bitwise">
      <ProjectSelect @select="load" data-test="project-select" />
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
              <li class="hr"><hr></li>
              <li @click="newModule('NewComponent', 'Component.ts')">Component</li>
              <li @click="newModule('NewComponentForm', 'Component.vue')">Component Form</li>
              <li @click="newModule('NewSystem', 'System.ts')">System</li>
              <li @click="newModule('NewSystemForm', 'Component.vue')">System Form</li>
            </ul>
          </MenuButton>
          <button class="menu-button" title="Import" @click="importFiles">
            <i class="fa fa-file-import"></i>
          </button>
        </div>
        <MenuButton title="Project">
          <template #title>
            <i class="fa fa-gear"></i>
          </template>
          <ul>
            <li @click="showGameConfigTab">Game Config</li>
            <li class="hr"><hr></li>
            <li @click="showReleaseTab">Release...</li>
          </ul>
        </MenuButton>
      </div>
      <ObjectTree dragtype="file" :ondblclickitem="openTab" :items="projectItems" :ondropitem="onDropFile" class="app-sidebar-item">
        <template #menu="{item}">
          <MenuButton>
            <template #button>
              <i class="fa-solid fa-ellipsis-vertical project-tree-item-menu-button"></i>
            </template>
            <ul>
              <li @click="deleteFile(item)">Delete</li>
            </ul>
          </MenuButton>
        </template>
      </ObjectTree>
    </div>

    <header class="app-tabbar">
      <nav>
        <a v-for="tab, i in openTabs" href="#"
          @click.prevent="showTab(i)" :key="tab.src"
          :aria-current="i === currentTabIndex ? 'true' : ''"
        >
          <i class="fa" :class="tab.icon"></i> {{tab.name}}
          <i class="delete fa fa-circle-xmark" @click.prevent.stop="closeTab(i)"></i>
        </a>
      </nav>
    </header>

    <component class="app-main" v-if="currentTab"
      ref="currentTab"
      :is="currentTab.component" :edited="currentTab.edited"
      :key="currentTab.src"
      v-model:name="currentTab.name"
      v-model="currentTab.data"
      @update:modelValue="updateTab"
      @update:name="updateTabName"
      @save="saveTab"
    />

    <div class="console" :style="openConsole ? 'top: -50vh' : ''">
      <div class="console-top">
        <span @click="toggleConsole">Console</span>
        <span class="console-info">
          <span v-if="consoleErrors > 0"><i class="fa fa-hexagon-xmark"></i>{{consoleErrors || 0}}</span>
          <span v-if="consoleWarnings > 0"><i class="fa fa-triangle-exclamation"></i>{{consoleWarnings || 0}}</span>
        </span>
      </div>
      <div class="console-bottom">
        <p v-for="log in consoleLogs" :class="'log-' + log.level"><span v-for="msg in log.msg">{{msg}}</span></p>
      </div>
    </div>
  </div>
</template>

<style>
html, body, #app { height: 100% }

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

h1, h2, h3, h4, h5, h6 {
  color: var(--bw-color);
}

input, select, textarea {
  color: var(--bw-color);
  background: var(--bw-background-color);
  border-color: var(--bw-border-color);
  border-width: 1px;
  border-radius: 3px;
}
input:focus, select:focus {
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
  border-color: rgba( 0, 0, 0, 0.1 );
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
