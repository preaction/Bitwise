<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
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
    <div class="d-flex position align-items-center">
      <label>X</label>
      <input name="x" @change="update" v-model="modelValue.x">
      <label>Y</label>
      <input name="y" @change="update" v-model="modelValue.y">
      <label>Z</label>
      <input name="z" @change="update" v-model="modelValue.z">
    </div>
    <div class="d-flex position align-items-center">
      <span>Rotate</span>
      <label>X</label>
      <input name="rx" @change="update" v-model="modelValue.rx">
      <label>Y</label>
      <input name="ry" @change="update" v-model="modelValue.ry">
      <label>Z</label>
      <input name="rz" @change="update" v-model="modelValue.rz">
      <label>W</label>
      <input name="rw" @change="update" v-model="modelValue.rw">
    </div>
    <div class="d-flex position align-items-center">
      <span>Scale</span>
      <label>X</label>
      <input name="sx" @change="update" v-model="modelValue.sx">
      <label>Y</label>
      <input name="sy" @change="update" v-model="modelValue.sy">
      <label>Z</label>
      <input name="sz" @change="update" v-model="modelValue.sz">
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
