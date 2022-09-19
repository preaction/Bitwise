<script lang="ts">
import { defineComponent } from "vue";
import ObjectTreeItem from "./ObjectTreeItem.vue";

export default defineComponent({
  props: ['items'],
  data() {
    return {
    };
  },
  components: {
    ObjectTreeItem,
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
  <div class="object-tree">
    <div v-for="item in items" class="text-start">
      <ObjectTreeItem @select="select" v-bind="item" />
    </div>
  </div>
</template>

<style>
  .object-tree {
    font-size: 0.9em;
    height: 100%;
    margin: 0 0.2em;
    overflow-y: scroll;
  }
</style>
