<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      width: '',
      height: '',
      backgroundColor: '#000000FF',
      borderWidth: '',
      borderColor: '#000000',
      borderStyle: 'none',
      borderRadius: '',
      margin: '',
      padding: '',
      ...this.modelValue,
    }
  },
  computed: {
    alphaInput() {
      return parseInt( this.backgroundColor.slice(-2), 16 );
    },
    colorInput() {
      return this.backgroundColor.slice(0,7);
    },
  },
  methods: {
    updateColor( event:InputEvent ) {
      const elem = event.target as HTMLInputElement;
      this.backgroundColor = elem.value + this.backgroundColor.slice(-2);
      this.update();
    },
    updateAlpha( event:InputEvent ) {
      const elem = event.target as HTMLInputElement;
      this.backgroundColor = this.backgroundColor.slice(0, 7) + parseInt(elem.value).toString(16);
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
      <label>Width</label>
      <input v-model="width" @change="update" />
    </div>
    <div class="d-flex position align-items-center">
      <label>Height</label>
      <input v-model="height" @change="update" />
    </div>
    <div class="d-flex position align-items-center">
      <label>Background Color</label>
      <input type="color" :value="colorInput" @change="updateColor" />
    </div>
    <div class="d-flex position align-items-center">
      <label>Background Alpha</label>
      <input type="range" min="0" max="255" step="1" :value="alphaInput" @change="updateAlpha" />
    </div>
    <div class="d-flex position align-items-center">
      <label>Border Style</label>
      <select v-model="borderStyle" @change="update">
        <option>none</option>
        <option>solid</option>
        <option>dotted</option>
        <option>dashed</option>
        <option>outset</option>
        <option>inset</option>
        <option>ridge</option>
        <option>groove</option>
        <option>double</option>
      </select>
    </div>
    <div class="d-flex position align-items-center">
      <label>Border Width</label>
      <input v-model="borderWidth" @change="update" />
    </div>
    <div class="d-flex position align-items-center">
      <label>Border Color</label>
      <input type="color" v-model="borderColor" @change="update" />
    </div>
    <div class="d-flex position align-items-center">
      <label>Border Radius</label>
      <input v-model="borderRadius" @change="update" />
    </div>
    <div class="d-flex position align-items-center">
      <label>Margin</label>
      <input v-model="margin" @change="update" />
    </div>
    <div class="d-flex position align-items-center">
      <label>Padding</label>
      <input v-model="padding" @change="update" />
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
