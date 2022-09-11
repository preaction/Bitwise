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
  <div class="project-tree">
    <div v-for="item in projectItems" class="text-start">
      <ProjectTreeItem @select="select" v-bind="item" />
    </div>
  </div>
</template>

<style>
  .project-tree {
    font-size: 0.9em;
    height: 100%;
    margin: 0 0.2em;
    overflow-y: scroll;
  }
</style>
