<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
export default defineComponent({
  props: ['src'],
  data() {
    return {
      name: 'New Tileset',
      edited: false,
      imageSrc: '',
      gutter: 0,
      tileWidth: 0,
      tileHeight: 0,
    };
  },
  mounted() {
    this.$emit('update', { name: this.name, edited: this.edited });
  },
  computed: {
    ...mapState( useAppStore, ['currentProject'] ),
  },
  methods: {
    ...mapActions( useAppStore, ['getFileUrl', 'saveFile'] ),
    dragover(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "link";
    },
    drop(event) {
      const data = event.dataTransfer.getData("bitwise/file");
      if ( data ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "link";
        console.log( data );
        this.imageSrc = data;
        this.edited = true;
        this.updateTab();
      }
      else {
        event.dataTransfer.dropEffect = "";
      }
    },
    updateTab() {
      this.$emit( 'update', { name: this.name, edited: this.edited } );
    },
    save() {
      // XXX: Rename if needed
      var src = this.src;
      if ( !src ) {
        src = this.name + '.json';
      }
      // XXX: Update "src" property
      this.saveFile( src, {
        imageSrc: this.imageSrc,
        tileWidth: this.tileWidth,
        tileHeight: this.tileHeight,
        gutter: this.gutter,
      });
      this.edited = false;
      this.updateTab();
    },
  },
});
</script>

<template>
  <div class="tileset-edit">
    <div class="tab-toolbar">
      <div class="btn-toolbar" role="toolbar" aria-label="Tileset editor toolbar">
        <div class="btn-group" role="group" aria-label="File actions">
          <button type="button" class="btn btn-outline-dark"
            :disabled="!edited" @click="save"
          >
            <i class="fa fa-save"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="tab-main" @dragover="dragover" @drop="drop">
      <!-- XXX: Center -->
      <img v-if="imageSrc" :src="getFileUrl( imageSrc )" />
      <div v-else>Drag/drop an image here</div>
      <!-- XXX: Grid overlay -->
    </div>
    <div class="tab-sidebar">
      <div>
        <label>Name</label>
        <input v-model="name" @change="updateTab" />
      </div>
      <div @dragover="dragover" @drop="drop">
        <span v-if="imageSrc">{{ imageSrc }}</span>
        <span v-else>Image Select</span>
      </div>
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
