<script lang="ts">
import { defineComponent } from "vue";
import ObjectTreeItem from "./ObjectTreeItem.vue";

export default defineComponent({
  props: ['items', 'onclickitem', 'ondblclickitem', 'dragtype'],
  data() {
    return {
    };
  },
  components: {
    ObjectTreeItem,
  },
});
</script>

<template>
  <div class="object-tree">
    <div v-for="item in items" class="text-start">
      <ObjectTreeItem :onclickitem="onclickitem" :ondblclickitem="ondblclickitem" :item="item" :dragtype="dragtype" />
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
