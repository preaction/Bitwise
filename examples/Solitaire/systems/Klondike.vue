<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: ['modelValue', 'scene'],
  data() {
    return {
      drawEntityPath: '',
      discardEntityPath: '',
      ...this.modelValue,
    };
  },
  watch: {
    // XXX: It is annoying to have to manually emit the update event
    // here...
    drawEntityPath() {
      this.update();
    },
    discardEntityPath() {
      this.update();
    },
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
    <div class="d-flex justify-content align-items-center">
      <label class="me-1">Draw</label>
      <InputGameObject v-model="drawEntityPath" type="entity" drop-effect="link" />
    </div>
    <div class="d-flex justify-content align-items-center">
      <label class="me-1">Discard</label>
      <InputGameObject v-model="discardEntityPath" type="entity" drop-effect="link" />
    </div>
  </div>
</template>
<style>
</style>
