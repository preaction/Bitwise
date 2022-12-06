<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: [
    'modelValue',
    'on',
    'off',
  ],
  methods: {
    update( newValue ) {
      this.$emit( 'update:modelValue', newValue );
    },
  },
});
</script>
<template>
  <input type="checkbox" @change="update( modelValue == on ? off : on )" :checked="modelValue == on">
</template>
