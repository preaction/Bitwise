<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from 'pinia';
import { useAppStore } from "../store/app.ts";
export default defineComponent({
  props: ['src'],
  computed: {
    ...mapState( useAppStore, ['currentProject'] ),
    url() {
      return 'bfile://' + this.currentProject + '/' + this.src;
    },
  },
});
</script>

<template>
  <img :src="url" />
</template>
