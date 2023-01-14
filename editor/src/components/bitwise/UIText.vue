<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      text: '',
      ...this.modelValue,
    }
  },
  methods: {
    update() {
      this.$emit( 'update:modelValue', this.$data );
      this.$emit( 'update', this.$data );
    },
    updateText(event:KeyboardEvent) {
      this.$data.text = (event.target as HTMLTextAreaElement).value;
      this.update();
    },
  },
});
</script>
<template>
  <div>
    <label class="me-1">Text</label>
    <textarea class="uitext" v-model="text" @keyup="updateText"></textarea>
  </div>
</template>
<style>
  .uitext {
    width: 100%;
    height: 4em;
  }
</style>
