<script lang="ts">
import { defineComponent, toRaw } from "vue";
import InputGameObject from '../InputGameObject.vue';

export default defineComponent({
  props: ['modelValue', 'scene'],
  components: {
    InputGameObject,
  },
  data() {
    const textureId = this.modelValue.textureId ?? null;
    const texturePath = this.scene.game.texturePaths[ textureId ];
    return {
      textureId,
      texturePath,
    };
  },
  watch: {
    texturePath(newPath) {
      this.loadTexture(newPath);
    },
  },
  methods: {
    update() {
      const newModel = {
        textureId: this.textureId,
      };
      this.$emit( 'update:modelValue', newModel );
      this.$emit( 'update', newModel );
    },
    async loadTexture( path ) {
      await this.scene.game.loadTexture( path );
      this.textureId = this.$data.textureId = this.scene.game.textureIds[ path ];
      this.update();
    },
  },
});
</script>
<template>
  <div>
    <div class="d-flex justify-content-between texture-field align-items-center">
      <label class="me-1">Texture</label>
      <InputGameObject v-model="texturePath" type="file" drop-effect="link" />
    </div>
  </div>
</template>
<style>
  .texture-field input {
    cursor: default;
  }
</style>
