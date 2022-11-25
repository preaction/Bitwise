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
  methods: {
    exportGame( type:string ) {
      // const gameFile = await this.buildGameFile();
      // Add all non-code files
      // Build index.html that starts the game's main scene
      // zip: Just zip it all up
      // electron: Copy it all to a directory with electron-builder
    },
  },
});
</script>

<template>
  <div class="m-2">
    <h5>Export</h5>
    <h6>Itch.io Browser Game</h6>
    <button @click="exportGame('zip')">Export</button>
  </div>
</template>

<style>
</style>
