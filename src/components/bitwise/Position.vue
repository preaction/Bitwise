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
      this.$emit( 'update', this.$data );
    },
  },
});
</script>
<template>
  <div>
    <h6>Position</h6>
    <div class="d-flex position align-items-center">
      <label>X</label>
      <input @change="update" v-model="$data.x">
      <label>Y</label>
      <input @change="update" v-model="$data.y">
      <label>Z</label>
      <input @change="update" v-model="$data.z">
    </div>
  </div>
</template>
<style>
  .position label {
    padding: 0 2px;
  }
  .position input {
    margin: 0 4px 0 0;
    flex: 1 1 auto;
    width: 2em;
    text-align: right;
  }
</style>
