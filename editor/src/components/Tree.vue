<script lang="ts" setup generic="T extends TreeNode">
import { ref, computed } from "vue";
import type { TreeNode } from '../types';
const DBLCLICK_DELAY = 250;

const props = defineProps<{
  node: T,
  dirname?: string,
  expand?: boolean | null,
  onclick?: (node: T, path: string) => void | undefined,
  ondblclick?: (node: T, path: string) => void | undefined
  ondragstart?: (event: DragEvent, node: T, path: string) => void | undefined
  ondragover?: (event: DragEvent, node: T, path: string) => void | undefined
  ondrop?: (event: DragEvent, node: T, path: string) => void | undefined
}>();

let clickTimeout: ReturnType<typeof setTimeout> | void;
let expand = ref(false);

// isRoot should default to true, since this sets dirname on descendants
const isRoot = !props.dirname;

// XXX: Instead of rewriting the drag/drop behaviors every time, make
// the Tree component handle them. Tree node has methods for content type, content, and if it
// accepts a given child node, and Tree component emit nodeMove event when node moves so data can be updated

const nodePath = (props.dirname ? props.dirname + '/' : "") + props.node.name;
const isFolder = computed(() => props.node?.children?.length >= 0);
const hasChildren = computed(() => props.node?.children?.length > 0);
const showChildren = computed(() => props.expand || expand.value);
const childTrees = ref<Array<Tree>>([]);

function handleClick() {
  // If we don't need to handle double-click, we can just handle the
  // click right away!
  if (!props.ondblclick) {
    if (!props.onclick && props.node.children) {
      toggleChildren();
    }
    else if (props.onclick) {
      props.onclick(props.node, nodePath);
    }
  }
  // Otherwise, if we need to handle both click and double-click
  else if ((props.onclick || props.node.children) && !clickTimeout) {
    // First click, start the timeout
    clickTimeout = setTimeout(() => {
      clearClickTimeout();
      if (props.onclick) {
        props.onclick(props.node, nodePath);
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
    props.ondblclick(props.node, nodePath);
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
  expand.value = expand.value ? false : true;
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
  if (props.ondragstart) {
    props.ondragstart(event, props.node, nodePath)
  }
}

function dragover(event: DragEvent) {
  if (props.ondrop) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (props.ondragover) {
      props.ondragover(event, props.node, nodePath);
    }
  }
}

function drop(event: DragEvent) {
  if (props.ondrop) {
    props.ondrop(event, props.node, nodePath);
  }
  else {
    event.dataTransfer.dropEffect = "none";
  }
}

function dragend(event: DragEvent) {
}

function removeNode(node: T) {
  const idx = node.children.indexOf(node);
  if (idx >= 0) {
    node.children.splice(idx, 1);
    return true;
  }
  for (const tree of childTrees.value || []) {
    const removed = tree.removeNode(node);
    if (removed) {
      return removed;
    }
  }
  return false;
}

defineExpose({
  removeNode,
});
</script>

<template>
  <div class="asset-tree-item" :class="isRoot ? 'tree-root' : ''">
    <a class="name ps-1 d-flex" :data-path="nodePath" draggable="true" @dragstart="dragstart" @dragend="dragend"
      @dragover="dragover" @drop="drop" @click="handleClick" @dblclick="handleDoubleClick"
      @mousedown="preventTextSelect">
      <span class="label">
        <span v-if="props.node.icon">
          <i v-if="hasChildren" class="me-1 fa show-children" @click.stop="toggleChildren"
            :class="showChildren ? 'fa-caret-down' : 'fa-caret-right'"></i>
          <i class="me-1 fa" :class="props.node.icon"></i>
        </span>
        <span v-else-if="isFolder" class="me-1">
          <i class="fa show-children" @click.stop="toggleChildren"
            :class="showChildren ? 'fa-folder-open' : 'fa-folder'"></i>
        </span>
        <span data-test="name">{{ props.node.name }}</span>
      </span>
      <span class="asset-tree-item__menu">
        <slot name="menu" :node="node" />
      </span>
    </a>
    <div v-if="hasChildren && showChildren" class="children">
      <div v-for="child in props.node.children" :key="nodePath + '/' + child.name">
        <Tree ref="childTrees" :onclick="props.onclick" :ondblclick="props.ondblclick" :ondragstart="props.ondragstart"
          :ondragover="props.ondragover" :ondrop="props.ondrop" :node="child" :dirname="nodePath">
          <template #menu="{ child: node }">
            <slot name="menu" :node="node" />
          </template>
        </Tree>
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
  margin-left: auto;
}

.asset-tree-item .name:hover .asset-tree-item__menu {
  display: block;
}
</style>
