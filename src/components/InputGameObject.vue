<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue', 'type', 'dropEffect'],
  methods: {
    update(data) {
      this.$emit( 'update:modelValue', data );
    },
    dragover(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = this.dropEffect;
    },
    async drop(event) {
      const data = event.dataTransfer.getData(`bitwise/${this.type}`);
      if ( data ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = this.dropEffect;
        this.update(data);
      }
      else {
        event.dataTransfer.dropEffect = "";
      }
    },
  },
  computed: {
    name() {
      return this.modelValue ? this.modelValue.split('/').pop() : undefined;
    },
  },
});
</script>
<template>
  <input readonly class="gameobject-input flex-fill col-1 text-end" :value="name" placeholder="Drag/Drop Here"
    @dragover="dragover" @drop="drop"
  />
</template>
<style>
  .gameobject-input {
    cursor: default;
  }
</style>

