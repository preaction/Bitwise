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

export default defineComponent({
  components: {
    NewTab,
    ObjectTree,
    ProjectSelect,
    ImageView,
    TilesetEdit,
    SceneEdit,
  },
  data() {
    return {
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
  },
  mounted() {
    if ( this.hasSessionState ) {
      this.loadSessionState();
    }
    if ( !this.currentProject ) {
      this.modal = new bootstrap.Modal( this.$refs.projectDialog, {} );
      this.modal.show();
    }
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
      <div class="dropdown m-2">
        <button class="btn btn-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          Add to Project...
        </button>
        <ul class="dropdown-menu">
          <!-- <li><a class="dropdown-item" href="#" @click="newFolder()">Folder...</a></li> -->
          <!-- <li><hr class="dropdown-divider"></li> -->
          <li><a class="dropdown-item" href="#" @click="newTab('New Scene', 'SceneEdit')">Scene</a></li>
          <li><a class="dropdown-item" href="#" @click="newTab('New Tileset', 'TilesetEdit')">Tileset</a></li>
        </ul>
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
  </div>
</template>

<style>
html, body, #app { height: 100% }
.app-container {
  height: 100%;
  overflow: hidden;
  display: grid;
  place-content: stretch;
  grid-template-rows: 42px 1fr;
  grid-template-columns: minmax(0, auto) 1fr;
  grid-template-areas: "sidebar tabbar" "sidebar main";
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
