<script setup lang="ts">
const props = withDefaults(defineProps<{
  id?: string
  title?: string
  label?: string
  hidden?: boolean
  labelledBy?: string
}>(), {
  hidden: false,
});
</script>
<template>
  <div :id="id" :aria-labelledby="props.labelledBy" :aria-label="props.label" :title="props.title">
    <slot />
  </div>
</template>
