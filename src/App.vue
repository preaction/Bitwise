<script lang="ts">
import * as bootstrap from "bootstrap";
import { defineComponent, markRaw } from "vue";
import { mapStores, mapState, mapActions, mapGetters } from 'pinia';
import { useAppStore } from "./store/app.ts";
import NewTab from "./components/NewTab.vue";
import MapEditor from "./components/MapEditor.vue";
import ProjectTree from "./components/ProjectTree.vue";
import ProjectSelect from "./components/ProjectSelect.vue";
import ImageView from "./components/ImageView.vue";
import TilesetEdit from "./components/TilesetEdit.vue";

export default defineComponent({
  components: {
    NewTab,
    MapEditor,
    ProjectTree,
    ProjectSelect,
    ImageView,
    TilesetEdit,
  },
  data() {
    return {
    };
  },
  computed: {
    ...mapStores(useAppStore),
    ...mapState(useAppStore, ['currentProject', 'currentTabIndex', 'openTabs']),
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
    showTab( index: Number ) {
      this.appStore.showTab( index );
    },
    load() {
      this.modal.hide();
    },
    newTab( name:string, component ) {
      this.appStore.openTab({
        name,
        component,
        data: {},
        edited: true,
      });
    },

    async openTab( item ) {
      // Determine what kind of component to use
      const name = item.name;
      if ( name.match( /\.json$/ ) ) {
        // JSON files are game objects
        console.log( 'open component', item );
        // Fetch the file to decide which tab component to use
        const fileContent = await this.appStore.readFile(item.path);
        const data = JSON.parse( fileContent );
        const tab = {
          name: item.name,
          src: item.path,
          component: data.component,
          data: data,
          edited: false,
        };
        this.appStore.openTab(tab);
      }
      else if ( name.match( /\.(png|gif|jpe?g)$/ ) ) {
        const tab = {
          name,
          src: item.path,
          component: "ImageView",
          data: item.path,
          edited: false,
        };
        this.appStore.openTab(tab);
      }
    },

    closeTab( i:Number ) {
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
        const res = await this.appStore.newFile(
          tab.name,
          'json',
          JSON.stringify( tab.data ),
        );
        console.log('newFile', res);
        if ( !res.canceled ) {
          this.currentTab.src = res.filePath;
          this.currentTab.edited = false;
        }
        return;
      }
      // Otherwise, just write the data!
      const res = await this.appStore.saveFile(
        tab.src,
        JSON.stringify( tab.data ),
      );
      console.log('saveFile', res);
      this.currentTab.edited = false;
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
      <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        Add to Project...
      </button>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="#" @click="newTab('New Tileset', 'TilesetEdit')">Tileset</a></li>
      </ul>
    </div>
    <ProjectTree @select="openTab" />
  </div>

  <header class="app-tabbar">
    <nav class="px-2">
      <a v-for="tab, i in openTabs" href="#"
        @click.prevent="showTab(i)" :key="tab.src"
        :aria-current="i === currentTabIndex ? 'true' : ''"
      >
        {{tab.name}}
        <i class="fa-solid fa-circle-xmark" @click.prevent.stop="closeTab(i)"></i>
      </a>
    </nav>
  </header>

  <component class="app-main" v-if="currentTab"
    :is="currentTab.component" :edited="currentTab.edited"
    :key="currentTab.src"
    v-model="currentTab.data"
    @update:modelValue="updateTab" @save="saveTab"
  />
</template>

<style>
html, body { height: 100% }
#app {
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

.app-tabbar :link i {
  visibility: hidden;
}
.app-tabbar :link:hover i {
  visibility: visible;
}

</style>
