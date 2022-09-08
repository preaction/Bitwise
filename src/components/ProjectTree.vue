<script lang="ts">
import { defineComponent } from "vue";
import { mapStores } from 'pinia';
import { useAppStore } from "../store/app.ts";

export default defineComponent({
  data() {
    return {
    };
  },
  computed: {
    ...mapStores(useAppStore),
  },
  methods: {
    newTab() {
      this.appStore.openTab({ name: "Test", component: "MapEditor", props: {}, edited: false });
    },
    addToProject() {
      // - Tilemap
      // - Tileset
    },
  }
});
</script>

<template>
  <div class="d-flex flex-column align-items-center my-2">
    <div class="dropdown mt-2">
      <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        Add to Project
      </button>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="#" @click="addTilemap">Tilemap</a></li>
        <li><a class="dropdown-item" href="#" @click="addTileset">Tileset</a></li>
      </ul>
    </div>
    <p>Tilemaps</p>
    <p>Tilesets</p>
  </div>
</template>

<style>
</style>
