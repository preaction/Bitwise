<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue', 'scene'],
  data() {
    return {
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
    <div class="d-flex justify-content-between align-items-center">
      <label>Frustum</label>
      <input @change="update" v-model="$data.frustum" class="text-end">
    </div>
    <div class="d-flex justify-content-between align-items-center">
      <label>Zoom</label>
      <input @change="update" v-model="$data.zoom" class="text-end">
    </div>
    <div class="d-flex justify-content-between align-items-center">
      <label>Near</label>
      <input @change="update" v-model="$data.near" class="text-end">
    </div>
    <div class="d-flex justify-content-between align-items-center">
      <label>Far</label>
      <input @change="update" v-model="$data.far" class="text-end">
    </div>
  </div>
</template>
<style>
</style>
