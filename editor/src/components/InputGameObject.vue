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
      event.preventDefault();
      event.dataTransfer.dropEffect = this.dropEffect || "link";
    },
    async drop(event:DragEvent) {
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
  <input readonly class="gameobject-input flex-fill col-1 text-end" :value="displayName" placeholder="Drag/Drop Here"
    @dragover="dragover" @drop="drop"
  />
</template>
<style>
  .gameobject-input {
    cursor: default;
  }
</style>

