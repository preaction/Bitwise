<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from 'pinia';
import { useAppStore } from "../store/app.ts";
export default defineComponent({
  props: ['src'],
  data() {
    return {
      name: 'New Tileset',
      imageSrc: '',
      gutter: 0,
      tileWidth: 0,
      tileHeight: 0,
    };
  },
  mounted() {
    this.$emit('update', { name: this.name, edited: false });
  },
  computed: {
    ...mapState( useAppStore, ['currentProject'] ),
    imageUrl() {
      return 'bfile://' + this.currentProject + '/' + this.imageSrc;
    },
  },
});
</script>

<template>
  <div class="tileset-edit">
    <div class="tab-toolbar">
      Toolbar
    </div>
    <div class="tab-main">
      <!-- XXX: Center -->
      <img v-if="imageSrc" :src="imageUrl" />
      <div v-else>Drag/drop an image here</div>
      <!-- XXX: Grid overlay -->
    </div>
    <div class="tab-sidebar">
      <div>Image Select</div>
      <div>
        <label>Tile Width</label>
        <input v-model="tileWidth" />
      </div>
      <div>
        <label>Tile Height</label>
        <input v-model="tileHeight" />
      </div>
      <div>
        <label>Gutter</label>
        <input v-model="gutter" />
      </div>
    </div>
  </div>
</template>

<style>
  .tileset-edit {
    display: grid;
    place-content: stretch;
    grid-template-rows: 42px 1fr;
    grid-template-columns: 1fr minmax(0, auto);
    grid-template-areas: "toolbar toolbar" "main sidebar";
  }
  .tab-toolbar {
    grid-area: toolbar;
    padding: 2px;
    background: var(--bs-gray-100);
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .1);
  }
  .tab-sidebar {
    grid-area: sidebar;
    padding: 2px;
  }
  .tab-main {
    grid-area: main;
    padding: 2px;
    align-self: center;
    justify-self: center;
  }
</style>
