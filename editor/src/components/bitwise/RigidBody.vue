<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      rz: 0,
      lx: 1,
      ly: 1,
      lz: 1,
      ax: 1,
      ay: 1,
      az: 1,
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
      <span>Velocity</span>
      <label>X</label>
      <input @change="update" v-model="$data.vx">
      <label>Y</label>
      <input @change="update" v-model="$data.vy">
      <label>Z</label>
      <input @change="update" v-model="$data.vz">
    </div>
    <div class="d-flex position align-items-center">
      <span>Torque</span>
      <label>X</label>
      <input @change="update" v-model="$data.rx">
      <label>Y</label>
      <input @change="update" v-model="$data.ry">
      <label>Z</label>
      <input @change="update" v-model="$data.rz">
    </div>
    <div class="d-flex position align-items-center">
      <span>Freeze Position</span>
      <label>X</label>
      <BinaryToggle @change="update" v-model="$data.lx" on="0" off="1">
      <label>Y</label>
      <BinaryToggle @change="update" v-model="$data.ly" on="0" off="1">
      <label>Z</label>
      <BinaryToggle @change="update" v-model="$data.lz" on="0" off="1">
    </div>
    <div class="d-flex position align-items-center">
      <span>Freeze Rotation</span>
      <label>X</label>
      <BinaryToggle @change="update" v-model="$data.ax" on="0" off="1">
      <label>Y</label>
      <BinaryToggle @change="update" v-model="$data.ay" on="0" off="1">
      <label>Z</label>
      <BinaryToggle @change="update" v-model="$data.az" on="0" off="1">
    </div>
  </div>
</template>
<style>
</style>
