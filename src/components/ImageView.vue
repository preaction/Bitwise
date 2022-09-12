<script lang="ts">
import { defineComponent } from "vue";
import { mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
export default defineComponent({
  props: ['modelValue'],
  methods: {
    ...mapActions( useAppStore, ['getFileUrl'] ),
  },
});
</script>

<template>
  <img :src="getFileUrl(modelValue)" />
</template>
