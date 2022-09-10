<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: 'ProjectTreeItem',
  props: ['name', 'children'],
  data() {
    return {
      showChildren: false,
    };
  },
  computed: {
    hasChildren() {
      return this.children && this.children.length > 0;
    },
  },
  methods: {
    toggleChildren() {
      this.showChildren = this.showChildren ? false : true;
    },
  },
});
</script>

<template>
  <div class="project-tree-item">
    <div class="name ps-1 d-flex justify-content-between" @click="toggleChildren">
      <span>{{ name }}</span>
      <span v-if="hasChildren">
        <i class="bi" :class="showChildren ? 'bi-caret-down-fill' : 'bi-caret-right-fill'"></i>
      </span>
    </div>
    <div v-if="hasChildren && showChildren" class="children">
      <div v-for="child in children">
        <ProjectTreeItem v-bind="child" />
      </div>
    </div>
  </div>
</template>

<style>
  .project-tree-item .name {
    cursor: pointer;
    padding: 2px;
    margin: 0 0 0 -2px;
  }
  .project-tree-item:hover > .name {
    background: #ddd;
  }
  .project-tree-item .children {
    border-left: 2px solid var(--bs-gray-300);
    margin-left: 2px;
  }
</style>
