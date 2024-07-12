<script lang="ts">
import { defineComponent } from "vue";
import BinaryToggle from "../BinaryToggle.vue";
export default defineComponent({
  components: { BinaryToggle },
  props: ['modelValue'],
  data() {
    return {}
  },
  methods: {
    update() {
      this.$emit('update:modelValue', this.modelValue);
    },
  },
});
</script>
<template>
  <div>
    <div class="d-flex align-items-center">
      <label>Mass</label>
      <input name="mass" @change="update" v-model.number="modelValue.mass">
    </div>
    <div class="d-flex position align-items-center">
      <span>Velocity</span>
      <label>X</label>
      <input name="vx" @change="update" v-model.number="modelValue.vx">
      <label>Y</label>
      <input name="vy" @change="update" v-model.number="modelValue.vy">
      <label>Z</label>
      <input name="vz" @change="update" v-model.number="modelValue.vz">
    </div>
    <div class="d-flex position align-items-center">
      <span>Torque</span>
      <label>X</label>
      <input name="rx" @change="update" v-model.number="modelValue.rx">
      <label>Y</label>
      <input name="ry" @change="update" v-model.number="modelValue.ry">
      <label>Z</label>
      <input name="rz" @change="update" v-model.number="modelValue.rz">
    </div>
    <div class="d-flex position align-items-center">
      <span>Freeze Position</span>
      <label>X</label>
      <BinaryToggle name="lx" @change="update" v-model.number="modelValue.lx" on="0" off="1" />
      <label>Y</label>
      <BinaryToggle name="ly" @change="update" v-model.number="modelValue.ly" on="0" off="1" />
      <label>Z</label>
      <BinaryToggle name="lz" @change="update" v-model.number="modelValue.lz" on="0" off="1" />
    </div>
    <div class="d-flex position align-items-center">
      <span>Freeze Rotation</span>
      <label>X</label>
      <BinaryToggle name="ax" @change="update" v-model.number="modelValue.ax" on="0" off="1" />
      <label>Y</label>
      <BinaryToggle name="ay" @change="update" v-model.number="modelValue.ay" on="0" off="1" />
      <label>Z</label>
      <BinaryToggle name="az" @change="update" v-model.number="modelValue.az" on="0" off="1" />
    </div>
    <div class="d-flex position align-items-center">
      <span>Drag</span>
      <label>Linear</label>
      <input name="ld" @change="update" v-model.number="modelValue.ld">
      <label>Angular</label>
      <input name="ad" @change="update" v-model.number="modelValue.ad">
    </div>
  </div>
</template>
<style></style>
