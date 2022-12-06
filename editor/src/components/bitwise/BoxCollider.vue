<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      trigger: 0,
      ox: 0,
      oy: 0,
      oz: 0,
      sx: 1,
      sy: 1,
      sz: 1,
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
      <span>Origin</span>
      <label>X</label>
      <input @change="update" v-model="$data.ox">
      <label>Y</label>
      <input @change="update" v-model="$data.oy">
      <label>Z</label>
      <input @change="update" v-model="$data.oz">
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
    <div class="d-flex align-items-center justify-content-between">
      <label>Is Trigger?</label>
      <BinaryToggle @change="update" on="1" off="0" v-model="$data.trigger" />
    </div>
  </div>
</template>
<style>
</style>
