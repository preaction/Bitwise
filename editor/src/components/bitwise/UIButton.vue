<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      action: '',
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
    <div>
      <label class="me-1">Action</label>
      <input v-model="action" @change="update" />
    </div>
  </div>
</template>
<style>
  .uitext {
    width: 100%;
    height: 4em;
  }
</style>
