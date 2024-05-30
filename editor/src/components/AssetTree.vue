<script setup lang="ts">
import type { Asset } from '@fourstar/bitwise';
import Tree from './Tree.vue';
import type Project from '../model/Project';
import { inject } from 'vue';
import type Backend from '../Backend';
import MenuButton from "./MenuButton.vue";
const props = defineProps<{
  project: Project,
  expand?: boolean,
  onclick?: (node: Asset) => void | undefined,
  ondblclick?: (node: Asset) => void | undefined
}>();

const backend = inject('backend') as Backend
function ondragstart(event: DragEvent, asset: Asset) {
  event.dataTransfer.setData('bitwise/asset', JSON.stringify(asset.ref()));
}

function deleteFile(item: Asset) {
  if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
    backend.deleteItem(props.project.name, item.path);
  }
}

function onDropFile(event: DragEvent) {
  const data = event.dataTransfer.getData("bitwise/file");
  if (data) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const dropPath = event.currentTarget.dataset.path;
    // If the destination is a file, move to the parent folder
    const parts = dropPath.split('/');
    let destItem = props.project.assets.find(item => item.name + item.ext === parts[0]);
    let parentPath = '';
    for (const part of parts.slice(1)) {
      parentPath += '/' + destItem.name;
      destItem = destItem.children.find(item => item.name === part);
    }
    let destination = destItem.isDirectory ? destItem.path : parentPath;
    destination += '/' + data.split('/').pop();
    renamePath(data, destination);
  }
  else {
    event.dataTransfer.dropEffect = "";
  }
}

function renamePath(path: string, dest: string) {
  // XXX: Pre-move item in assets
  return electron.renamePath(props.project.name, path, dest);
}

</script>
<template>
  <Tree v-for="asset in project.assets" :ondblclick="props.ondblclick" :node="asset" :ondrop="onDropFile"
    :ondragstart="ondragstart">
    <template #menu="{ asset }">
      <MenuButton>
        <template #button>
          <i class="fa-solid fa-ellipsis-vertical project-tree-item-menu-button"></i>
        </template>
        <ul>
          <li @click="deleteFile(asset)">Delete</li>
        </ul>
      </MenuButton>
    </template>
  </Tree>
</template>
