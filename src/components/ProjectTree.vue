<script lang="ts">
import { defineComponent } from "vue";
import { mapStores, mapState } from 'pinia';
import { useAppStore } from "../store/app.ts";
import ProjectTreeItem from "./ProjectTreeItem.vue";

export default defineComponent({
  data() {
    return {
    };
  },
  components: {
    ProjectTreeItem,
  },
  computed: {
    ...mapStores(useAppStore),
    ...mapState(useAppStore, ['projectItems']),
  },
  methods: {
    select(item) {
      this.$emit('select', item);
    },
    addToProject() {
      // - Tilemap
      // - Tileset
    },
  }
});
</script>

<template>
  <div class="d-flex flex-column align-items-stretch project-tree">
    <div class="dropdown my-2">
      <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        Add to Project...
      </button>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="#" @click="addTilemap">Tilemap</a></li>
        <li><a class="dropdown-item" href="#" @click="addTileset">Tileset</a></li>
      </ul>
    </div>
    <div class="project-tree-scroll">
      <div v-for="item in projectItems" class="text-start">
        <ProjectTreeItem @select="select" v-bind="item" />
      </div>
    </div>
  </div>
</template>

<style>
  .project-tree {
    font-size: 0.9em;
    height: 100%;
    margin: 0 0.2em;
  }
  .project-tree-scroll {
    overflow-y: scroll;
  }
</style>
