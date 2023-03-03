<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      imagePath: '',
      fill: 'stretch',
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
    <div class="d-flex uiimage justify-content-between align-items-center">
      <label class="me-1">Path</label>
      <InputGameObject v-model="imagePath" @update="update" type="file" drop-effect="link" />
    </div>
    <div class="d-flex position align-items-center">
      <label>Fill</label>
      <select v-model="fill" @change="update">
        <option>stretch</option>
        <option>repeat</option>
        <option>repeat-x</option>
        <option>repeat-y</option>
      </select>
    </div>
  </div>
</template>
<style>
</style>
