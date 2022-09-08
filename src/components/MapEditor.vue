<script lang="ts">
import { defineComponent } from "vue";
import ThreeJS from "./ThreeJS.vue";
export default defineComponent({
  components: {
    ThreeJS,
  }
});
</script>

<template>
  <main class="edit-map">
    <div class="toolbar p-2 d-flex bg-light justify-content-between">
      Toolbar
    </div>

    <div class="main">
      <ThreeJS ref="three" />
    </div>

    <div ref="tilesets" class="tilesets bg-light m-0 d-flex flex-column">
      <div class="flex-fill p-2">
        <div class="text-center">Layers</div>
      </div>
      <div class="flex-fill p-2">
        <div class="text-center">Tilesets</div>
      </div>
    </div>
  </main>
</template>

<style>
.edit-map {
  display: grid;
  grid-template-columns: 1fr minmax(0, auto);
  grid-template-rows: 42px 1fr;
  place-content: stretch;
  height: 100%;
  overflow: hidden;
}

.toolbar {
  grid-column: 1/-1;
  grid-row: 1;
  display: flex;
  z-index: 2;
  background: white;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .1)
}

.tilesets {
  --sidebar-size: 175px;
  grid-column: 2;
  grid-row: 2;
  width: var(--sidebar-size);
  transition: width 0.2s;
}
.tilesets.hide {
  width: 2em;
}

.tilesets > * {
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .1);
}

.main {
  grid-column: 1;
  grid-row: 2;
  height: 100%;
  overflow: hidden;
}
</style>
