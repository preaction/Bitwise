<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  data() {
    return {
    };
  },
  emits: {
    update( payload: { name: string, edited: boolean } ) {
      return name.length > 0;
    },
  },
  components: {
  }
});
</script>

<template>
  <h1>New Tab</h1>

</template>

<style>
</style>
