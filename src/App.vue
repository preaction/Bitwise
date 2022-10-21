<script lang="ts">
import * as bootstrap from "bootstrap";
import { defineComponent, markRaw, toRaw } from "vue";
import { mapStores, mapState, mapActions, mapGetters } from 'pinia';
import { useAppStore } from "./store/app.ts";
import NewTab from "./components/NewTab.vue";
import ObjectTree from "./components/ObjectTree.vue";
import ProjectSelect from "./components/ProjectSelect.vue";
import ImageView from "./components/ImageView.vue";
import TilesetEdit from "./components/TilesetEdit.vue";
import SceneEdit from "./components/SceneEdit.vue";
import GameConfig from "./components/GameConfig.vue";

export default defineComponent({
  components: {
    NewTab,
    ObjectTree,
    ProjectSelect,
    ImageView,
    TilesetEdit,
    SceneEdit,
    GameConfig,
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
    ...mapActions(useAppStore, ['loadSessionState']),
    updateTab(data:Object) {
      console.log( 'updated', data );
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
      this.modal.hide();
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

    async openTab( item ) {
      // Determine what kind of component to use
      const ext = item.ext;
      if ( ext === '.json' ) {
        // JSON files are game objects
        console.log( 'open component', item );
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
          JSON.stringify( toRaw( tab.data ) ),
        );
        return;
      }
      // Name changes? Write new file and delete old
      if ( tab.src != tab.name + tab.ext && !tab.src.endsWith('/' + tab.name + tab.ext) ) {
        const oldSrc = tab.src;
        const newSrc = oldSrc.replace( oldSrc.substring( oldSrc.lastIndexOf( '/' ) + 1 ), tab.name + tab.ext );
        console.log( `Rename file ${oldSrc} to ${newSrc}` );
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
        await this.appStore.saveFile( tab.src, JSON.stringify( tab.data ) );
        await this.appStore.deleteTree( oldSrc );
        return;
      }
      // Otherwise, just write the data!
      await this.appStore.saveFile(
        tab.src,
        JSON.stringify( tab.data ),
      );
    },

    showFileDropdown( event:MouseEvent ) {
      if ( this._showingDropdown ) {
        this._showingDropdown.hide();
      }
      const el = event.target.closest( '.dropdown' );
      if ( !el ) {
        console.log( ".dropdown not found for ", event.target );
      }
      const dropdown = bootstrap.Dropdown.getInstance( el.querySelector('[data-bs-toggle]') );
      dropdown.show();
      this._showingDropdown = dropdown;
    },

    hideFileDropdown( event:MouseEvent ) {
      const el = event.target.closest( '.dropdown' );
      if ( !el ) {
        console.log( ".dropdown not found for ", event.target );
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
      let data = {};

      try {
        const fileContent = await this.appStore.readFile('bitwise.config.json');
        data = JSON.parse( fileContent );
      }
      catch (err) {
        console.log( `Error opening bitwise.config.json: ${err}` );
      }

      this.appStore.openTab({
        name: "Game Config",
        component: "GameConfig",
        ext: 'json',
        icon: 'fa-gear',
        src: 'bitwise.config.json',
        data: data,
        edited: false,
      });
    },

    log( level:string, ...msg:any[] ) {
      this.console[level](...msg);
      this.consoleLogs.push( { level, msg } );
      if ( level === "error" ) {
        this.consoleErrors++;
      }
      else if ( level === "warn" ) {
        this.consoleWarnings++;
      }
    },

    toggleConsole() {
      this.openConsole = this.openConsole ? false : true;
      if ( this.openConsole === false ) {
        this.consoleErrors = 0;
        this.consoleWarnings = 0;
      }
    },
  },
  mounted() {
    // Override console logging
    this.console = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
      info: console.info,
    };
    console.log = (...args:any[]) => this.log( 'log', ...args );
    console.warn = (...args:any[]) => this.log( 'warn', ...args );
    console.error = (...args:any[]) => this.log( 'error', ...args );
    console.debug = (...args:any[]) => this.log( 'debug', ...args );
    console.info = (...args:any[]) => this.log( 'info', ...args );

    if ( this.hasSessionState ) {
      this.loadSessionState();
    }
    if ( !this.currentProject ) {
      this.modal = new bootstrap.Modal( this.$refs.projectDialog, {} );
      this.modal.show();
    }
    electron.on( 'error', (ev, err) => console.error(err) );
    electron.on( 'log', (ev, msg) => console.log(msg) );
  },
});
</script>

<template>
  <div class="app-container">
    <div ref="projectDialog" class="modal fade modal-lg" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="welcomeDialogTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title" id="welcomeDialogTitle">
              Welcome to Bitwise
            </h3>
          </div>
          <div class="modal-body">
            <ProjectSelect @select="load" />
          </div>
          <div class="modal-footer">
          </div>
        </div>
      </div>
    </div>

    <div class="app-sidebar bg-light">
      <div class="d-flex align-items-center justify-content-between">
        <div class="dropdown m-2 flex-fill">
          <button class="btn btn-secondary btn-sm w-100 text-start" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            Add...
          </button>
          <ul class="dropdown-menu">
            <!-- <li><a class="dropdown-item" href="#" @click="newFolder()">Folder...</a></li> -->
            <!-- <li><hr class="dropdown-divider"></li> -->
            <li><a class="dropdown-item" href="#" @click="newTab('New Scene', 'SceneEdit')">Scene</a></li>
            <li><a class="dropdown-item" href="#" @click="newTab('New Tileset', 'TilesetEdit')">Tileset</a></li>
          </ul>
        </div>
        <button class="btn btn-secondary btn-sm me-2" type="button" @click="showGameConfigTab">
          <i class="fa fa-gear"></i>
        </button>
      </div>
      <ObjectTree dragtype="file" :ondblclickitem="openTab" :items="projectItems">
        <template #menu="{item}">
          <div class="dropdown dropend filetree-dropdown" @click.prevent.stop="hideFileDropdown">
            <i class="fa-solid fa-ellipsis-vertical" @click.prevent.stop="showFileDropdown"
              data-bs-toggle="dropdown"
              data-bs-config='{ "popperConfig": { "strategy": "fixed" }}'></i>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="#" @click="deleteFile(item)">Delete</a></li>
            </ul>
          </div>
        </template>
      </ObjectTree>
    </div>

    <header class="app-tabbar">
      <nav class="px-2">
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
.app-container {
  position: relative;
  height: 100%;
  overflow: hidden;
  display: grid;
  place-content: stretch;
  grid-template-rows: 24px 1fr minmax(32px, auto);
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
  background: var(--bs-body-bg);
  border-top: 1px solid rgba(0, 0, 0, .1);
  overflow: hidden;
  display: flex;
  flex-flow: column;
}

.console-top {
  height: 32px;
  padding: 0.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, .1);
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
  background: rgba(var(--bs-light-rgb), var(--bs-bg-opacity));
}

.console-bottom p {
  margin: 0;
  padding: 0.25rem;
  border-width: 0 0 1px 0;
  border-style: solid;
  border-color: rgba( 0, 0, 0, 0.1 );
}

.console-bottom .log-log {
  background: var(--bs-bg-gray);
}
.console-bottom .log-error {
  background: rgba(var(--bs-danger-rgb), 0.3);
}
.console-bottom .log-warn {
  background: rgba(var(--bs-warning-rgb), 0.3);
}

.app-sidebar {
  --sidebar-width: auto;
  grid-area: sidebar;
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, .1);
  width: var(--sidebar-width);
  max-width: var(--sidebar-width);
  transition: width 0.2s;
  display: flex;
  flex-flow: column;
}

.app-main {
  grid-area: main;
}

.app-tabbar {
  grid-area: tabbar;
  background: var(--bs-body-bg);
}
.app-tabbar :link {
  color: var(--bs-gray);
  text-decoration: none;
  border: 1px solid black;
  background: var(--bs-body-bg);
  padding: 2px;
  margin: 0 2px 0 0;
}

.app-tabbar :link[aria-current=true] {
  color: var(--bs-light);
  background: var(--bs-primary);
}

.app-tabbar :link i.delete {
  visibility: hidden;
}
.app-tabbar :link:hover i.delete {
  visibility: visible;
}

.filetree-dropdown > i {
  display: none;
  padding: 0 2px;
}
.object-tree-item .name:hover .filetree-dropdown > i,
.object-tree-item .name .filetree-dropdown > i.show {
  display: inline;
}

</style>
