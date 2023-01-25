<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      flow: 'column',
      justify: 'start',
      align: 'stretch',
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
      <label class="me-1">Flow</label>
      <select v-model="flow" @change="update">
        <option>column</option>
        <option>row</option>
      </select>
    </div>
    <div class="d-flex justify-content-between align-items-center">
      <label class="me-1">Justify</label>
      <select v-model="justify" @change="update">
        <option>start</option>
        <option>center</option>
        <option>end</option>
        <option>space-between</option>
        <option>space-around</option>
      </select>
    </div>
    <div class="d-flex justify-content-between align-items-center">
      <label class="me-1">Align</label>
      <select v-model="align" @change="update">
        <option>stretch</option>
        <option>start</option>
        <option>center</option>
        <option>end</option>
      </select>
    </div>
  </div>
</template>
<style>
</style>
