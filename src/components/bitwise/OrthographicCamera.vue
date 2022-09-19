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
    <h6>Orthographic Camera</h6>
    <div>
      <label>Frustum
        <input @change="update" v-model="$data.frustum">
      </label>
    </div>
  </div>
</template>
<style>
</style>
