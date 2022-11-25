<script lang="ts">
import { defineComponent } from "vue";
import * as commonmark from 'commonmark';
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      reader: new commonmark.Parser(),
      writer: new commonmark.HtmlRenderer({ safe: true }),
    };
  },
  computed: {
    html() {
      return this.writer.render( this.reader.parse( this.modelValue ) );
    },
  },
});
</script>

<template>
  <div class="markdown-view" v-html="html" />
</template>
<style>
  .markdown-view {
    padding: 0.4em;
  }
</style>
