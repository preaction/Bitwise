<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
  data() {
    return {
      text: '',
      align: 'start',
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
    <div>
      <label class="me-1">Text</label>
      <textarea class="uitext" v-model="text" @keyup="updateText"></textarea>
    </div>
    <div class="d-flex justify-content-between align-items-center">
      <label class="me-1">Align</label>
      <select v-model="align" @change="update">
        <option>start</option>
        <option>center</option>
        <option>end</option>
      </select>
    </div>
  </div>
</template>
<style>
  .uitext {
    width: 100%;
    height: 4em;
  }
</style>
