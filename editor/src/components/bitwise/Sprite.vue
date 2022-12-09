<script lang="ts">
import { defineComponent, toRaw } from "vue";
import InputGameObject from '../InputGameObject.vue';

export default defineComponent({
  props: ['modelValue', 'scene'],
  components: {
    InputGameObject,
  },
  data() {
    return {
      ...this.modelValue,
    };
  },
  watch: {
    texturePath() {
      this.update();
    },
  },
  methods: {
    update() {
      const newModel = {
        texturePath: this.texturePath,
      };
      console.log( `Updated texture: ${this.texturePath}` );
      this.$emit( 'update:modelValue', newModel );
      this.$emit( 'update', newModel );
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
