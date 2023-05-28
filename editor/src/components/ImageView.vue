<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  inject: ['baseUrl'],
});
</script>

<template>
  <img :src="baseUrl + '/' + modelValue.src" />
</template>
