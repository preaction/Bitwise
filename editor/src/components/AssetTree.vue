<script lang="ts">
import { defineComponent } from "vue";
import Asset from "../../../game/src/Asset";
const DBLCLICK_DELAY = 250;

export default defineComponent({
  name: 'AssetTree',
  props: ['asset', 'expand', 'onclick', 'ondblclick', 'ondragover', 'ondrop'],
  data() {
    return {
      clickTimeout: null,
      _expand: this.expand,
    };
  },
  computed: {
    name() {
      // Treat the asset's path as canonical if possible
      return this.asset?.path ? this.asset.path.split('/').slice(-1)[0] : this.asset?.name;
    },
    isFolder() {
      return this.asset?.children?.length >= 0;
    },
    hasChildren() {
      return this.asset?.children?.length > 0;
    },
    showChildren() {
      return typeof this.expand !== "undefined" ? this.expand : this._expand;
    },
  },
  methods: {
    handleClick() {
      // If we don't need to handle double-click, we can just handle the
      // click right away!
      if ( !this.ondblclick ) {
        if ( !this.onclick && this.asset.children ) {
          this.toggleChildren();
        }
        else if ( this.onclick ) {
          this.onclick(this.asset);
        }
      }
      // Otherwise, if we need to handle both click and double-click
      else if ( (this.onclick||this.asset.children) && !this.clickTimeout ) {
        // First click, start the timeout
        this.clickTimeout = setTimeout( () => {
          this.clearClickTimeout();
          if ( this.onclick ) {
            this.onclick(this.asset);
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
      if ( this.ondblclick ) {
        this.ondblclick(this.asset);
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
    preventTextSelect(event:MouseEvent) {
      // This must be done separately because selection happens after
      // mousedown and dblclick happens after mouseup
      // https://stackoverflow.com/a/43321596
      if (event.detail === 2) {
        event.preventDefault();
      }
    },
    dragstart( event:DragEvent ) {
      event.dataTransfer.setData('bitwise/asset', this.asset.ref());
    },
    dragover(event:DragEvent) {
      if ( this.ondrop ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if ( this.ondragover ) {
          this.ondragover(event, this.asset);
        }
      }
    },
    drop( event:DragEvent ) {
      if ( this.ondrop ) {
        this.ondrop(event, this.asset);
      }
      else {
        event.dataTransfer.dropEffect = "none";
      }
    },
    dragend( event:DragEvent ) {
    },
    removeAsset( asset:Asset ) {
      const idx = this.asset.children.indexOf( asset );
      if ( idx >= 0 ) {
        this.asset.children.splice( idx, 1 );
        return true;
      }
      for ( const tree of this.$refs.children || [] ) {
        const removed = tree.removeAsset( asset );
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
  <div class="asset-tree-item">
    <div class="name ps-1 d-flex"
      :data-path="asset.path"
      draggable="true" @dragstart="dragstart" @dragend="dragend"
      @dragover="dragover" @drop="drop"
      @click="handleClick" @dblclick="handleDoubleClick"
      @mousedown="preventTextSelect"
    >
      <span v-if="asset.icon">
        <i v-if="hasChildren" class="me-1 fa show-children" @click.stop="toggleChildren" :class="showChildren ? 'fa-caret-down' : 'fa-caret-right'"></i>
        <i class="me-1 fa" :class="asset.icon"></i>
      </span>
      <span v-else-if="isFolder" class="me-1">
        <i class="fa show-children" @click.stop="toggleChildren" :class="showChildren ? 'fa-folder-open' : 'fa-folder'"></i>
      </span>
      <span class="flex-fill" data-test="name">{{ name }}</span>
      <span class="asset-tree-item__menu">
        <slot name="menu" :asset="asset" />
      </span>
    </div>
    <div v-if="hasChildren && showChildren" class="children">
      <div v-for="child in asset.children">
        <AssetTree ref="children" :onclick="onclick" :ondblclick="ondblclick" :ondragover="ondragover" :ondrop="ondrop" :asset="child">
          <template #menu="{asset}">
            <slot name="menu" :asset="asset" />
          </template>
        </AssetTree>
      </div>
    </div>
  </div>
</template>

<style>
  .asset-tree-item .name {
    cursor: pointer;
    padding: 2px;
    margin: 0;
  }
  .asset-tree-item:hover > .name {
    color: var(--bw-color-hover);
    background: var(--bw-background-color-hover);
  }
  .asset-tree-item .children {
    border-left: 1px dotted var(--bw-color);
    margin-left: 2px;
  }

  .asset-tree-item__menu {
    display: none;
  }

  .asset-tree-item .name:hover .asset-tree-item__menu {
    display: block;
  }

</style>
