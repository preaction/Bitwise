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
    <h6>Orthographic Camera</h6>
    <div>
      <label>Frustum
        <input @change="update" v-model="$data.frustum">
      </label>
    </div>
    <div>
      <label>Zoom
        <input @change="update" v-model="$data.zoom">
      </label>
    </div>
    <div>
      <label>Near
        <input @change="update" v-model="$data.near">
      </label>
    </div>
    <div>
      <label>Far
        <input @change="update" v-model="$data.far">
      </label>
    </div>
  </div>
</template>
<style>
</style>
