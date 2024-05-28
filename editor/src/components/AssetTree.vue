<script setup lang="ts">
import type { Asset } from '@fourstar/bitwise';
import Tree from './Tree.vue';
const props = defineProps<{
  asset: Asset,
  expand?: boolean,
  onclick?: (node: Asset) => void | undefined,
  ondblclick?: (node: Asset) => void | undefined
  ondragover?: (event: DragEvent, node: Asset) => void | undefined
  ondrop?: (event: DragEvent, node: Asset) => void | undefined
}>();

function ondragstart(event: DragEvent, asset: Asset) {
  event.dataTransfer.setData('bitwise/asset', JSON.stringify(asset.ref()));
}
</script>
<template>
  <Tree :node="props.asset" :expand="props.expand" :onclick="props.onclick" :ondblclick="props.ondblclick"
    :ondragstart="ondragstart" :ondragover="props.ondragover" :ondrop="props.ondrop" />
</template>
