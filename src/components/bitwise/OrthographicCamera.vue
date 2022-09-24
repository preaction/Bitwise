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
      <label class="me-1">Frustum</label>
      <input @change="update" v-model="$data.frustum" class="flex-fill col-1 text-end">
    </div>
    <div class="d-flex justify-content-between align-items-center">
      <label class="me-1">Zoom</label>
      <input @change="update" v-model="$data.zoom" class="flex-fill col-1 text-end">
    </div>
    <div class="d-flex justify-content-between align-items-center">
      <label class="me-1">Near</label>
      <input @change="update" v-model="$data.near" class="flex-fill col-1 text-end">
    </div>
    <div class="d-flex justify-content-between align-items-center">
      <label class="me-1">Far</label>
      <input @change="update" v-model="$data.far" class="flex-fill col-1 text-end">
    </div>
  </div>
</template>
<style>
</style>
