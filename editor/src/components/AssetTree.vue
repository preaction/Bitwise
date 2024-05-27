<script lang="ts" setup>
import { Asset } from "@fourstar/bitwise";
import { ref, computed } from "vue";
const DBLCLICK_DELAY = 250;

const props = defineProps<{
  asset: Asset,
  expand?: boolean,
  onclick?: (asset: Asset) => void | undefined,
  ondblclick?: (asset: Asset) => void | undefined
  ondragover?: (event: DragEvent, asset: Asset) => void | undefined
  ondrop?: (event: DragEvent, asset: Asset) => void | undefined
}>();

let clickTimeout: ReturnType<typeof setTimeout> | void;
let expand = ref(props.expand);

const name = computed(
  () => {
    // Treat the asset's path as canonical if possible
    return props.asset?.path ? props.asset.path.split('/').slice(-1)[0] : props.asset?.name;
  },
);
const isFolder = computed(() => props.asset?.children?.length >= 0);
const hasChildren = computed(() => props.asset?.children?.length > 0);
const showChildren = computed(() => typeof props.expand !== 'undefined' ? props.expand : expand);

const childTrees = ref([]);

function handleClick() {
  // If we don't need to handle double-click, we can just handle the
  // click right away!
  if (!props.ondblclick) {
    if (!props.onclick && props.asset.children) {
      toggleChildren();
    }
    else if (props.onclick) {
      props.onclick(props.asset);
    }
  }
  // Otherwise, if we need to handle both click and double-click
  else if ((props.onclick || props.asset.children) && !clickTimeout) {
    // First click, start the timeout
    clickTimeout = setTimeout(() => {
      clearClickTimeout();
      if (props.onclick) {
        props.onclick(props.asset);
      }
      else {
        toggleChildren();
      }
    }, DBLCLICK_DELAY);
    return;
  }
}
function handleDoubleClick() {
  clearClickTimeout();
  if (props.ondblclick) {
    props.ondblclick(props.asset);
  }
}
function clearClickTimeout() {
  if (clickTimeout) {
    clearTimeout(clickTimeout);
    clickTimeout = undefined;
  }
}
function toggleChildren() {
  clearClickTimeout();
  expand.value = expand ? false : true;
}

function preventTextSelect(event: MouseEvent) {
  // This must be done separately because selection happens after
  // mousedown and dblclick happens after mouseup
  // https://stackoverflow.com/a/43321596
  if (event.detail === 2) {
    event.preventDefault();
  }
}

function dragstart(event: DragEvent) {
  event.dataTransfer.setData('bitwise/asset', JSON.stringify(props.asset.ref()));
}

function dragover(event: DragEvent) {
  if (props.ondrop) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (props.ondragover) {
      props.ondragover(event, props.asset);
    }
  }
}

function drop(event: DragEvent) {
  if (props.ondrop) {
    props.ondrop(event, props.asset);
  }
  else {
    event.dataTransfer.dropEffect = "none";
  }
}

function dragend(event: DragEvent) {
}

function removeAsset(asset: Asset) {
  const idx = asset.children.indexOf(asset);
  if (idx >= 0) {
    asset.children.splice(idx, 1);
    return true;
  }
  for (const tree of childTrees.value || []) {
    const removed = tree.removeAsset(asset);
    if (removed) {
      return removed;
    }
  }
  return false;
}
</script>

<template>
  <div class="asset-tree-item">
    <div class="name ps-1 d-flex" :data-path="asset.path" draggable="true" @dragstart="dragstart" @dragend="dragend"
      @dragover="dragover" @drop="drop" @click="handleClick" @dblclick="handleDoubleClick"
      @mousedown="preventTextSelect">
      <span v-if="asset.icon">
        <i v-if="hasChildren" class="me-1 fa show-children" @click.stop="toggleChildren"
          :class="showChildren ? 'fa-caret-down' : 'fa-caret-right'"></i>
        <i class="me-1 fa" :class="asset.icon"></i>
      </span>
      <span v-else-if="isFolder" class="me-1">
        <i class="fa show-children" @click.stop="toggleChildren"
          :class="showChildren ? 'fa-folder-open' : 'fa-folder'"></i>
      </span>
      <span class="flex-fill" data-test="name">{{ name }}</span>
      <span class="asset-tree-item__menu">
        <slot name="menu" :asset="asset" />
      </span>
    </div>
    <div v-if="hasChildren && showChildren" class="children">
      <div v-for="child in asset.children">
        <AssetTree ref="childTrees" :onclick="props.onclick" :ondblclick="props.ondblclick"
          :ondragover="props.ondragover" :ondrop="props.ondrop" :asset="child">
          <template #menu="{ asset }">
            <slot name="menu" :asset="props.asset" />
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

.asset-tree-item:hover>.name {
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
