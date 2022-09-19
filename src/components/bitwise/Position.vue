<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      ...this.modelValue,
    }
  },
  methods: {
    update() {
      this.$emit( 'update:modelValue', this.$data );
    },
  },
});
</script>
<template>
  <div>
    <h6>Position</h6>
    <div>
      <label>X
        <input v-model="$data.x">
      </label>
    </div>
    <div>
      <label>Y
        <input v-model="$data.y">
      </label>
    </div>
    <div>
      <label>Z
        <input v-model="$data.z">
      </label>
    </div>
  </div>
</template>
<style>
</style>
