<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";

type Tileset = {
  imageSrc: string,
  tileWidth: number,
  tileHeight: number,
  gutter: number,
};

export default defineComponent({
  props: ['modelValue', 'edited'],
  data() {
    return {
      imageSrc: '',
      tileWidth: 16,
      tileHeight: 16,
      gutter: 0,
      ...this.modelValue,
    };
  },
  mounted() {
    this.$emit( 'update:modelValue', this.$data );
  },
  methods: {
    ...mapActions( useAppStore, ['getFileUrl'] ),
    dragover(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "link";
    },
    drop(event) {
      const data = event.dataTransfer.getData("bitwise/file");
      if ( data ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "link";
        this.imageSrc = data;
        this.update();
      }
      else {
        event.dataTransfer.dropEffect = "";
      }
    },
    update() {
      this.$emit('update:modelValue', {
        imageSrc: this.imageSrc,
        tileWidth: this.tileWidth,
        tileHeight: this.tileHeight,
        gutter: this.gutter,
      });
    },
    save() {
      this.$emit('save');
    },
  },
});
</script>

<template>
  <div class="tileset-edit">
    <div class="tileset-tab-toolbar">
      <div class="btn-toolbar" role="toolbar" aria-label="Tileset editor toolbar">
        <div class="btn-group" role="group" aria-label="File actions">
          <button type="button" class="btn btn-outline-dark btn-sm"
            :disabled="!edited" @click="save"
          >
            <i class="fa fa-save"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="tileset-tab-main" @dragover="dragover" @drop="drop">
      <!-- XXX: Center -->
      <img v-if="imageSrc" :src="getFileUrl( imageSrc )" />
      <div v-else>Drag/drop an image here</div>
      <!-- XXX: Grid overlay -->
    </div>
    <div class="tileset-tab-sidebar">
      <div @dragover="dragover" @drop="drop">
        <span v-if="imageSrc">{{ imageSrc }}</span>
        <span v-else>Image Select</span>
      </div>
      <div>
        <label>Tile Width</label>
        <input v-model="tileWidth" @change="update" />
      </div>
      <div>
        <label>Tile Height</label>
        <input v-model="tileHeight" @change="update" />
      </div>
      <div>
        <label>Gutter</label>
        <input v-model="gutter" @change="update" />
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
  .tileset-tab-toolbar {
    grid-area: toolbar;
    padding: 2px;
    background: var(--bs-gray-100);
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .1);
  }
  .tileset-tab-sidebar {
    grid-area: sidebar;
    padding: 2px;
  }
  .tileset-tab-main {
    grid-area: main;
    padding: 2px;
    align-self: center;
    justify-self: center;
  }
</style>
