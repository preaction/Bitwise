<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue', 'scene'],
  data() {
    return {
      boundary: null,
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
    <div class="d-flex align-items-center">
      <label>Boundary</label>
      <InputGameObject v-model="$data.boundaryPath" type="entity" @update="update">
    </div>
  </div>
</template>
