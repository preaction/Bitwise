<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  data() {
    return {
      ...this.$modelValue,
    };
  },
  update() {
    this.$emit('update:modelValue', { ...this.$data });
  },
});
</script>

<template>
  <div class="m-2">
    <h5>Viewport</h5>
    <p>XXX: Viewport configuration, height/width, allow rotation, aspect
    ratio?</p>
  </div>
</template>

<style>
</style>
