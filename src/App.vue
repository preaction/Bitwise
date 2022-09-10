<script lang="ts">
import * as bootstrap from "bootstrap";
import { defineComponent } from "vue";
import { mapStores } from 'pinia';
import { useAppStore } from "./store/app.ts";
import NewTab from "./components/NewTab.vue";
import MapEditor from "./components/MapEditor.vue";
import ProjectTree from "./components/ProjectTree.vue";
import ProjectSelect from "./components/ProjectSelect.vue";


export default defineComponent({
  components: {
    NewTab,
    MapEditor,
    ProjectTree,
    ProjectSelect,
  },
  data() {
    return {
    };
  },
  computed: {
    ...mapStores(useAppStore),
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
    updateTab({ name: string, edited: boolean }) {
      this.currentTab.name = name;
      this.currentTab.edited = edited;
    },
    showTab( index: Number ) {
      this.appStore.showTab( index );
    },
    load() {
      this.modal.hide();
    },
  },
  mounted() {
    this.modal = new bootstrap.Modal( this.$refs.projectDialog, {} );
    this.modal.show();
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

  <div class="sidebar bg-light">
    <ProjectTree />
  </div>

  <header>
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

  <component v-if="currentTab" @update="updateTab" :is="currentTab.component" :bind="currentTab.props" />
</template>

<style>
html, body { height: 100% }
#app {
  height: 100%;
  overflow: hidden;
  display: grid;
  place-content: stretch;
  grid-template-columns: minmax(0, auto) 1fr;
  grid-template-rows: 42px 1fr;
}

.sidebar {
  --sidebar-width: auto;
  grid-column: 1;
  grid-row: 1/-1;
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, .1);
  width: var(--sidebar-width);
  transition: width 0.2s;
  display: flex;
  flex-flow: column;
}

</style>
