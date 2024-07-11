<script lang="ts">
import { defineComponent, toRaw } from "vue";
import InputAsset from '../InputAsset.vue';
import type { AssetRef } from "../../../../game/dist/Asset";

export default defineComponent({
  props: ['modelValue', 'scene'],
  components: {
    InputAsset,
  },
  data() {
    return {}
  },
  mounted() {
    // Migrate from old texturePath to new texture Asset. Can probably
    // remove this once we reach v1 or v2.
    if (this.modelValue.texturePath) {
      const texture = { '$asset': 'Texture', path: this.modelValue.texturePath };
      delete this.modelValue.texturePath;
      this.modelValue.texture = texture;
      return texture;
    }
    return this.modelValue.texture;
  },
  methods: {
    update() {
      this.$emit('update:modelValue', this.modelValue);
    },
  },
});
</script>
<template>
  <div>
    <div class="d-flex justify-content-between texture-field align-items-center">
      <label class="me-1">Texture</label>
      <InputAsset name="texture" @update:modelValue="update" v-model="modelValue.texture" type="texture"
        drop-effect="link" />
    </div>
  </div>
</template>
<style>
.texture-field input {
  cursor: default;
}
</style>
