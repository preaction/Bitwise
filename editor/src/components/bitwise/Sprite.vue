<script lang="ts">
import { defineComponent, toRaw } from "vue";
import InputAsset from '../InputAsset.vue';

export default defineComponent({
  props: ['modelValue', 'scene'],
  components: {
    InputAsset,
  },
  data() {
    const data = {
      texture: {},
      ...this.modelValue,
    };
    // XXX: Migrate from texturePath to texture assets
    if (data.texturePath) {
      data.texture = { '$asset': 'Texture', path: data.texturePath };
      delete data.texturePath;
    }
    return data;
  },
  watch: {
    texture() {
      this.update();
    },
  },
  methods: {
    update() {
      const newModel = {
        texture: toRaw(this.texture),
      };
      this.$emit('update:modelValue', newModel);
      this.$emit('update', newModel);
    },
  },
});
</script>
<template>
  <div>
    <div class="d-flex justify-content-between texture-field align-items-center">
      <label class="me-1">Texture</label>
      <InputAsset v-model="texture" type="texture" drop-effect="link" />
    </div>
  </div>
</template>
<style>
.texture-field input {
  cursor: default;
}
</style>
