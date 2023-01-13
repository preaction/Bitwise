<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      backgroundColor: 0x000000FF,
      ...this.modelValue,
    }
  },
  computed: {
    alphaInput() {
      return this.backgroundColor & 0xFF;
    },
    colorInput() {
      return '#' + ((this.backgroundColor >> 8) & 0x00FFFFFF).toString(16).padStart(6, '0');
    },
  },
  methods: {
    updateColor( event:InputEvent ) {
      const elem = event.target as HTMLInputElement;
      const asNumber = parseInt(elem.value.slice(1), 16);
      this.backgroundColor = ( asNumber << 8 ) + this.alphaInput;
      this.update();
    },
    updateAlpha( event:InputEvent ) {
      const elem = event.target as HTMLInputElement;
      this.backgroundColor = ( this.backgroundColor & 0xFFFFFF00 ) + parseInt(elem.value);
      this.update();
    },
    update() {
      this.$emit( 'update:modelValue', this.$data );
      this.$emit( 'update', this.$data );
    },
  },
});
</script>
<template>
  <div>
    <div class="d-flex position align-items-center">
      <label>Background Color</label>
      <input type="color" :value="colorInput" @change="updateColor" />
    </div>
    <div class="d-flex position align-items-center">
      <label>Background Alpha</label>
      <input type="range" min="0" max="255" step="1" :value="alphaInput" @change="updateAlpha" />
    </div>
  </div>
</template>
<style>
  .position label {
    padding: 0 2px;
  }
  .position input {
    margin: 0 4px 0 0;
    flex: 1 1 auto;
    width: 2em;
    text-align: right;
  }
</style>
