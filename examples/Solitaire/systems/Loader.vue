<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: ['modelValue', 'scene'],
  data() {
    return {
      loadScenePath: '',
      progressEntityPath: '',
      ...this.modelValue,
    };
  },
  watch: {
    // XXX: It is annoying to have to manually emit the update event
    // here...
    loadScenePath() {
      this.update();
    },
    progressEntityPath() {
      this.update();
    },
  },
  methods: {
    update() {
      this.$emit('update:modelValue', this.$data);
      this.$emit('update', this.$data);
    },
  },
});
</script>
<template>
  <div>
    <div class="d-flex justify-content align-items-center">
      <label class="me-1">Scene to Load</label>
      <InputAsset v-model="loadScenePath" type="scene" drop-effect="link" />
    </div>
    <div class="d-flex justify-content align-items-center">
      <label class="me-1">Progress Bar</label>
      <InputEntity v-model="progressEntityPath" type="entity" drop-effect="link" />
    </div>
  </div>
</template>
<style></style>
