<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue', 'type', 'dropEffect'],
  methods: {
    update(data:any) {
      this.$emit( 'update:modelValue', data );
      this.$emit( 'update', data );
    },
    dragover(event:DragEvent) {
      if ( !event.dataTransfer ) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = this.dropEffect || "link";
    },
    async drop(event:DragEvent) {
      if ( !event.dataTransfer ) {
        return;
      }
      const data = event.dataTransfer.getData(`bitwise/${this.type}`);
      if ( data ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = this.dropEffect || "link";
        this.update(data);
      }
      else {
        event.dataTransfer.dropEffect = "none";
      }
    },
  },
  computed: {
    displayName() {
      return this.modelValue ? this.modelValue.split('/').pop() : undefined;
    },
  },
});
</script>
<template>
  <span class="gameobject-input flex-fill col-1 text-end"
    @dragover="dragover" @drop="drop"
  >{{displayName || "Drag/Drop Here"}}</span>
</template>
<style>
  .gameobject-input {
    cursor: default;
    border: 1px inset var(--bw-border-color);
    border-radius: 3px;
    overflow: hidden;
    padding: 1px 2px;
  }
</style>

