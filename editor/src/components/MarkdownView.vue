<script lang="ts">
import { defineComponent } from "vue";
import * as commonmark from 'commonmark';
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      markdown: '',
      reader: new commonmark.Parser(),
      writer: new commonmark.HtmlRenderer({ safe: true }),
    };
  },
  async mounted() {
    try {
      this.markdown = await this.modelValue.readFile();
    }
    catch (err) {
      console.log( `Error loading markdown data: ${err}` );
    }
  },
  computed: {
    html() {
      return this.writer.render( this.reader.parse( this.markdown ) );
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
