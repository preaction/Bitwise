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
        this.$data.textureId = this.scene.game.textureIds[ data ];
        this.update();
      }
      else {
        event.dataTransfer.dropEffect = "";
      }
    },
  },
  computed: {
    textureName() {
      return this.scene.game.texturePaths[ this.textureId ].split( '/' ).pop();
    },
  },
});
</script>
<template>
  <div>
    <h6>Sprite</h6>
    <div>
      <label>Texture
        <span @dragover="dragover" @drop="drop">{{textureName || "Drag/Drop Here"}}</span>
      </label>
    </div>
  </div>
</template>
<style>
</style>
