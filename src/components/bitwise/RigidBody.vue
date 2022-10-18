<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      vx: 0,
      vy: 0,
      vz: 0,
      mass: 0,
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
    <div class="d-flex align-items-center">
      <label>Mass</label>
      <input @change="update" v-model="$data.mass">
    </div>
    <div class="d-flex position align-items-center">
      <span>Inertia</span>
      <label>X</label>
      <input @change="update" v-model="$data.vx">
      <label>Y</label>
      <input @change="update" v-model="$data.vy">
      <label>Z</label>
      <input @change="update" v-model="$data.vz">
    </div>
  </div>
</template>
<style>
</style>
