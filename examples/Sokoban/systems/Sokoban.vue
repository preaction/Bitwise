<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: ['modelValue', 'scene'],
  data() {
    return {};
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
    <div class="d-flex justify-content align-items-center">
      <label class="me-1">Door</label>
      <InputEntity name="doorEntity" v-model="modelValue.doorEntity" />
    </div>
  </div>
</template>
<style></style>
