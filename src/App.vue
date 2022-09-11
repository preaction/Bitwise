<script lang="ts">
import * as bootstrap from "bootstrap";
import { defineComponent, markRaw } from "vue";
import { mapStores, mapState } from 'pinia';
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
    ...mapState(useAppStore, ['currentProject']),
    tabs() {
      return this.appStore.openTabs;
    },
    currentTabIndex() {
      return this.appStore.currentTabIndex;
    },
    currentTab() {
      return this.tabs[ this.currentTabIndex ];
    },
  },
  methods: {
    updateTab({ name, edited }) {
      this.currentTab.name = name;
      this.currentTab.edited = edited;
    },
    showTab( index: Number ) {
      this.appStore.showTab( index );
    },
    load() {
      this.modal.hide();
    },
    newTab( component ) {
      this.appStore.openTab({
        component,
        props: {},
      });
    },
    openTab( item ) {
      // Determine what kind of component to use
      const name = item.path[ item.path.length - 1 ];
      if ( name.match( /\.json$/ ) ) {
        // JSON files are game objects
        console.log( 'open component', item );
        // XXX: Fetch the file to decide which tab component to use
      }
      else if ( name.match( /\.(png|gif|jpe?g)$/ ) ) {
        const tab = {
          name,
          component: markRaw(ImageView),
          props: {
            src: item.path.join('/'),
          },
        };
        this.appStore.openTab(tab);
      }
    },
  },
  mounted() {
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
        <li><a class="dropdown-item" href="#" @click="newTab('TilesetEdit')">Tileset</a></li>
      </ul>
    </div>
    <ProjectTree @select="openTab" />
  </div>

  <header class="app-tabbar">
    <nav class="nav nav-tabs px-2">
      <a v-for="tab, i in tabs"
        href="#" class="nav-link"
        @click.prevent="showTab(i)"
        :aria-current="i === currentTabIndex ? 'true' : ''"
      >
        {{tab.name}}
      </a>
    </nav>
  </header>

  <component class="app-main" v-if="currentTab" @update="updateTab" :is="currentTab.component" v-bind="currentTab.props" />
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

</style>
