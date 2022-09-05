<script lang="ts">
import { defineComponent } from "vue";
import ThreeJS from "../components/ThreeJS.vue";
export default defineComponent({
  components: {
    ThreeJS,
  }
});
</script>

<template>
  <main class="edit-map">
    <div class="header p-2 d-flex bg-light justify-content-between">
      Toolbar
    </div>
    <div ref="sidebar" class="sidebar bg-light p-2 m-0 d-flex flex-column align-items-end">
      <div>
        Layers
      </div>
      <div>
        Tilesets
      </div>
    </div>

    <div class="main">
      <ThreeJS ref="three" />
    </div>
  </main>
</template>

<style>
.edit-map {
  display: grid;
  grid-template-columns: minmax(0, auto) 1fr;
  grid-template-rows: 60px 1fr;
  place-content: stretch;
  height: 100%;
  overflow: hidden;
}
.header {
  grid-column: 1/-1;
  display: flex;
  z-index: 2;
  background: white;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .1)
}
.sidebar {
  --sidebar-width: 225px;
  margin-right: 0.4em;
  grid-column: 1;
  grid-row: 2 / -1;
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, .1);
  width: var(--sidebar-width);
  transition: width 0.2s;
}
.sidebar.hide {
  width: 2em;
}
.main {
  grid-column: 2;
  grid-row: 2;
  height: 100%;
  overflow: hidden;
}
</style>
