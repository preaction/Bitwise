<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      sx: 1,
      sy: 1,
      sz: 1,
      rx: 0,
      ry: 0,
      rz: 0,
      rw: 0,
      ...this.modelValue,
    }
  },
  methods: {
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
      <label>X</label>
      <input @change="update" v-model="$data.x">
      <label>Y</label>
      <input @change="update" v-model="$data.y">
      <label>Z</label>
      <input @change="update" v-model="$data.z">
    </div>
    <div class="d-flex position align-items-center">
      <span>Rotate</span>
      <label>X</label>
      <input @change="update" v-model="$data.rx">
      <label>Y</label>
      <input @change="update" v-model="$data.ry">
      <label>Z</label>
      <input @change="update" v-model="$data.rz">
      <label>W</label>
      <input @change="update" v-model="$data.rw">
    </div>
    <div class="d-flex position align-items-center">
      <span>Scale</span>
      <label>X</label>
      <input @change="update" v-model="$data.sx">
      <label>Y</label>
      <input @change="update" v-model="$data.sy">
      <label>Z</label>
      <input @change="update" v-model="$data.sz">
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
