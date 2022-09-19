<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
});
</script>
<template>
  <div>
    <h6>Position</h6>
    <label>X
      <input v-model="$data.x">
    </label>
    <label>Y
      <input v-model="$data.y">
    </label>
    <label>Z
      <input v-model="$data.z">
    </label>
  </div>
</template>
<style>
</style>
