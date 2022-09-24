<script lang="ts">
import { defineComponent, toRaw } from "vue";
const DBLCLICK_DELAY = 250;

export default defineComponent({
  name: 'ObjectTreeItem',
  props: ['item', 'expand', 'onclickitem', 'ondblclickitem', 'dragtype'],
  data() {
    return {
      clickTimeout: null,
      _expand: this.expand,
    };
  },
  computed: {
    hasChildren() {
      return this.item?.children?.length > 0;
    },
    showChildren() {
      return typeof this.expand !== "undefined" ? this.expand : this._expand;
    },
  },
  methods: {
    handleClick() {
      // If we don't need to handle double-click, we can just handle the
      // click right away!
      if ( !this.ondblclickitem ) {
        if ( !this.onclickitem && this.item.children ) {
          this.toggleChildren();
        }
        else if ( this.onclickitem ) {
          this.onclickitem(this.item);
        }
      }
      // Otherwise, if we need to handle both click and double-click
      else if ( (this.onclickitem||this.item.children) && !this.clickTimeout ) {
        // First click, start the timeout
        this.clickTimeout = setTimeout( () => {
          this.clearClickTimeout();
          if ( this.onclickitem ) {
            this.onclickitem(this.item);
          }
          else {
            this.toggleChildren();
          }
        }, DBLCLICK_DELAY );
        return;
      }
    },
    handleDoubleClick() {
      this.clearClickTimeout();
      if ( this.ondblclickitem ) {
        this.ondblclickitem(this.item);
      }
    },
    clearClickTimeout() {
      if ( this.clickTimeout ) {
        clearTimeout( this.clickTimeout );
        this.clickTimeout = null;
      }
    },
    toggleChildren() {
      this.clearClickTimeout();
      this._expand = this._expand ? false : true;
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
      console.log( `Dragging ${this.path}: bitwise/${this.dragtype}` );
      event.dataTransfer.setData('bitwise/' + this.dragtype, this.item.path);
    },
  },
});
</script>

<template>
  <div class="object-tree-item">
    <div class="name ps-1 d-flex"
      draggable="true" @dragstart="dragstart"
      @click="handleClick" @dblclick="handleDoubleClick"
      @mousedown="preventTextSelect"
    >
      <span v-if="hasChildren" class="me-1">
        <i class="fa" @click.stop="toggleChildren" :class="showChildren ? 'fa-caret-down' : 'fa-caret-right'"></i>
      </span>
      <span>{{ item.name }}</span>
    </div>
    <div v-if="hasChildren && showChildren" class="children">
      <div v-for="child in item.children">
        <ObjectTreeItem :onclickitem="onclickitem" :ondblclickitem="ondblclickitem" :item="child" :dragtype="dragtype" />
      </div>
    </div>
  </div>
</template>

<style>
  .object-tree-item .name {
    cursor: pointer;
    padding: 2px;
    margin: 0 0 0 -2px;
  }
  .object-tree-item:hover > .name {
    background: #ddd;
  }
  .object-tree-item .children {
    border-left: 2px solid var(--bs-gray-300);
    margin-left: 2px;
  }
</style>
