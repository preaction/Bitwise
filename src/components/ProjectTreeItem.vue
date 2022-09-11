<script lang="ts">
import { defineComponent } from "vue";
const DBLCLICK_DELAY = 250;

export default defineComponent({
  name: 'ProjectTreeItem',
  props: ['name', 'path', 'children'],
  data() {
    return {
      clickTimeout: null,
      showChildren: false,
    };
  },
  computed: {
    hasChildren() {
      return this.children && this.children.length > 0;
    },
  },
  methods: {
    handleClick() {
      if ( !this.clickTimeout ) {
        // First click, start the timeout
        this.clickTimeout = setTimeout( () => this.toggleChildren(), DBLCLICK_DELAY );
        return;
      }
    },
    select() {
      this.clearClickTimeout();
      this.$emit('select', { path: this.path, name: this.name, children: this.children });
    },
    handleSelectChild(item) {
      this.$emit('select', item);
    },
    clearClickTimeout() {
      if ( this.clickTimeout ) {
        clearTimeout( this.clickTimeout );
        this.clickTimeout = null;
      }
    },
    toggleChildren() {
      this.clearClickTimeout();
      this.showChildren = this.showChildren ? false : true;
    },
    preventTextSelect(event) {
      // This must be done separately because selection happens after
      // mousedown and dblclick happens after mouseup
      // https://stackoverflow.com/a/43321596
      if (event.detail === 2) {
        event.preventDefault();
      }
    },
    dragstart( event ) {
      event.dataTransfer.setData('bitwise/file', this.path);
    },
  },
});
</script>

<template>
  <div class="project-tree-item">
    <div class="name ps-1 d-flex justify-content-between"
      draggable="true" @dragstart="dragstart"
      @click="handleClick" @dblclick="select"
      @mousedown="preventTextSelect"
    >
      <span>{{ name }}</span>
      <span v-if="hasChildren">
        <i class="bi" :class="showChildren ? 'bi-caret-down-fill' : 'bi-caret-right-fill'"></i>
      </span>
    </div>
    <div v-if="hasChildren && showChildren" class="children">
      <div v-for="child in children">
        <ProjectTreeItem v-bind="child" @select="handleSelectChild"/>
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
