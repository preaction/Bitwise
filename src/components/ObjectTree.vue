<script lang="ts">
import { defineComponent } from "vue";
import ObjectTreeItem from "./ObjectTreeItem.vue";

export default defineComponent({
  props: ['items', 'onclickitem', 'ondblclickitem', 'ondropitem', 'dragtype'],
  data() {
    return {
    };
  },
  components: {
    ObjectTreeItem,
  },
  methods: {
    removeItem( item ) {
      const idx = this.items.indexOf( item );
      if ( idx >= 0 ) {
        this.items.splice( idx, 1 );
        return true;
      }
      for ( const tree of this.$refs.children ) {
        const removed = tree.removeItem( item );
        if ( removed ) {
          return removed;
        }
      }
      return false;
    },
  },
});
</script>

<template>
  <div class="object-tree">
    <div v-for="item, i in items" class="text-start">
      <ObjectTreeItem ref="children" :onclickitem="onclickitem" :ondblclickitem="ondblclickitem" :ondropitem="ondropitem" :dragtype="dragtype" :item="item">
        <template #menu="{item}">
          <slot name="menu" :item="item" />
        </template>
      </ObjectTreeItem>
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
