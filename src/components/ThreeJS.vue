<script lang="ts">
import { defineComponent } from "vue";
import { mapStores } from 'pinia';
import { useAppStore } from "../store/app.ts";
import * as three from 'three';
import * as bitwise from '../Bitwise.ts';

export default defineComponent({
  data() {
    return {
      layers: [],
      tilesets: [],
    };
  },

  computed: {
    ...mapStores(useAppStore),
  },

  unmounted() {
    this.game.stop();
  },

  async mounted() {
    this.game = new bitwise.Game({
      canvas: this.$refs['canvas'],
      loader: {
        base: this.appStore.getFileUrl(""),
      },
    });

    // XXX: Scroll controls for zoom
    // XXX: Pinch controls for zoom

    const scene = new bitwise.Scene( this.game );
    this.game.scenes.push( scene );
    this.game.start();
    scene.start();
  },
});
</script>

<template>
  <canvas ref="canvas" />
</template>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
