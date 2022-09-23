<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue', 'scene'],
  data() {
    return {
      ...this.modelValue,
    }
  },
  methods: {
    update() {
      this.$emit( 'update:modelValue', this.$data );
      this.$emit( 'update', this.$data );
    },
    dragover(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "link";
    },
    async drop(event) {
      const data = event.dataTransfer.getData("bitwise/file");
      console.log( `Dropping on sprite`, data );
      if ( data ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "link";
        console.log( data );
        await this.scene.game.loadTexture( data );
        this.textureId = this.$data.textureId = this.scene.game.textureIds[ data ];
        this.update();
      }
      else {
        event.dataTransfer.dropEffect = "";
      }
    },
  },
  computed: {
    textureName() {
      return this.scene.game.texturePaths[ this.textureId ]?.split( '/' ).pop();
    },
  },
});
</script>
<template>
  <div>
    <div class="d-flex justify-content-between texture-field align-items-center" @dragover="dragover" @drop="drop">
      <label class="me-2">Texture</label>
      <input readonly class="flex-fill text-end" :value="textureName"
      placeholder="Drag/Drop Here"/>
    </div>
  </div>
</template>
<style>
  .texture-field input {
    cursor: default;
  }
</style>
