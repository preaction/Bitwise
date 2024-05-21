<script lang="ts">
import { defineComponent } from "vue";
import type {Texture} from '@fourstar/bitwise';
import type Tab from "../model/Tab";
export default defineComponent({
  props: ['modelValue'],
  inject: ['baseUrl'],
  computed: {
    texture():Texture {
      return (this.modelValue as Tab).asset as Texture;
    },
    src() {
      return this.baseUrl + '/' + this.texture.src;
    },
    style() {
      if ( this.texture.width || this.texture.height || this.texture.x || this.texture.y ) {
        const path = [
          'M', this.texture.x, this.texture.y,
          'h', this.texture.width,
          'v', this.texture.height,
          'h', -this.texture.width,
          'Z'
        ].join(" ");
        return `
          clip-path: path( '${path}' );
          position: absolute;
          top: -${this.texture.y}px;
          left: -${this.texture.x}px;
        `;
      }
      return "";
    },
  },
});
</script>

<template>
  <div style="overflow: hidden; position: relative;">
    <img :src="src" :style="style" />
  </div>
</template>
