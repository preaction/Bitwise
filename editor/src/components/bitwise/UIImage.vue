<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      imagePath: '',
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
  </div>
</template>
<style>
</style>
