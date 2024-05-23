<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue', 'type', 'dropEffect'],
  methods: {
    update(data: any) {
      this.$emit('update:modelValue', data);
      this.$emit('update', data);
    },
    dragover(event: DragEvent) {
      if (!event.dataTransfer) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = this.dropEffect || "link";
    },
    async drop(event: DragEvent) {
      if (!event.dataTransfer) {
        return;
      }
      const data = event.dataTransfer.getData(`bitwise/asset`);
      if (data) {
        event.preventDefault();
        event.dataTransfer.dropEffect = this.dropEffect || "link";
        console.log(`drop data`, JSON.stringify(data));
        this.update(JSON.parse(data));
      }
      else {
        event.dataTransfer.dropEffect = "none";
      }
    },
  },
  computed: {
    displayName() {
      if (!this.modelValue) {
        return undefined;
      }
      if (typeof this.modelValue === 'string') {
        return this.modelValue.split('/').pop();
      }
      if (typeof this.modelValue === 'object') {
        console.log(this.modelValue);
        if (!this.modelValue.path) {
          return;
        }
        return this.modelValue.path.split('/').pop();
      }
    },
  },
});
</script>
<template>
  <span class="gameobject-input flex-fill col-1 text-end" @dragover="dragover" @drop="drop">
    {{ displayName || "Drag/Drop Here" }}
  </span>
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
