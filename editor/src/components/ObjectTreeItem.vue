<script lang="ts">
import { defineComponent, toRaw } from "vue";
const DBLCLICK_DELAY = 250;

export default defineComponent({
  name: 'ObjectTreeItem',
  props: ['item', 'expand', 'onclickitem', 'ondblclickitem', 'ondragover', 'ondropitem', 'dragtype'],
  data() {
    return {
      clickTimeout: null,
      _expand: this.expand,
    };
  },
  computed: {
    name() {
      // Treat the item's path as canonical if possible
      return this.item?.path ? this.item.path.split('/').slice(-1)[0] : this.item?.name;
    },
    isFolder() {
      return this.item?.children?.length >= 0;
    },
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
      event.dataTransfer.setData('bitwise/' + this.dragtype, this.item.path);
      if ( this.item.dragtype ) {
        event.dataTransfer.setData('bitwise/' + this.item.dragtype, this.item.path);
      }
    },
    dragover(event) {
      if ( this.ondropitem ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if ( this.ondragover ) {
          this.ondragover(event, this.item);
        }
      }
    },
    drop( event ) {
      if ( this.ondropitem ) {
        this.ondropitem(event, this.item);
      }
      else {
        event.dataTransfer.dropEffect = "";
      }
    },
    dragend( event ) {
    },
    removeItem( item ) {
      const idx = this.item.children.indexOf( item );
      if ( idx >= 0 ) {
        this.item.children.splice( idx, 1 );
        return true;
      }
      for ( const tree of this.$refs.children || [] ) {
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
  <div class="object-tree-item">
    <div class="name ps-1 d-flex"
      :data-path="item.path"
      draggable="true" @dragstart="dragstart" @dragend="dragend"
      @dragover="dragover" @drop="drop"
      @click="handleClick" @dblclick="handleDoubleClick"
      @mousedown="preventTextSelect"
    >
      <span v-if="item.icon">
        <i v-if="hasChildren" class="me-1 fa" @click.stop="toggleChildren" :class="showChildren ? 'fa-caret-down' : 'fa-caret-right'"></i>
        <i class="me-1 fa" :class="item.icon"></i>
      </span>
      <span v-else-if="isFolder" class="me-1">
        <i class="fa" @click.stop="toggleChildren" :class="showChildren ? 'fa-folder-open' : 'fa-folder'"></i>
      </span>
      <span class="flex-fill" data-test="name">{{ name }}</span>
      <span class="object-tree-item__menu">
        <slot name="menu" :item="item" />
      </span>
    </div>
    <div v-if="hasChildren && showChildren" class="children">
      <div v-for="child in item.children">
        <ObjectTreeItem ref="children" :onclickitem="onclickitem" :ondblclickitem="ondblclickitem" :ondragover="ondragover" :ondropitem="ondropitem" :item="child" :dragtype="dragtype">
          <template #menu="{item}">
            <slot name="menu" :item="item" />
          </template>
        </ObjectTreeItem>
      </div>
    </div>
  </div>
</template>

<style>
  .object-tree-item .name {
    cursor: pointer;
    padding: 2px;
    margin: 0;
  }
  .object-tree-item:hover > .name {
    color: var(--bw-color-hover);
    background: var(--bw-background-color-hover);
  }
  .object-tree-item .children {
    border-left: 1px dotted var(--bw-color);
    margin-left: 2px;
  }

  .object-tree-item__menu {
    display: none;
  }

  .object-tree-item .name:hover .object-tree-item__menu {
    display: block;
  }

</style>
