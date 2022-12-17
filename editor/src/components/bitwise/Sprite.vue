<script lang="ts">
import { defineComponent, toRaw } from "vue";
import InputGameObject from '../InputGameObject.vue';

export default defineComponent({
  props: ['modelValue', 'scene'],
  components: {
    InputGameObject,
  },
  data() {
    const data = {
      ...this.modelValue,
      entityPath: '',
    };
    if ( !data.texturePath.match(/^[a-z]+:/) ) {
      data.entityPath = data.texturePath;
    }
    return data;
  },
  watch: {
    entityPath() {
      this.update();
    },
  },
  methods: {
    update() {
      const newModel = {
        texturePath: this.entityPath,
      };
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
      <InputGameObject v-model="entityPath" type="file" drop-effect="link" />
    </div>
  </div>
</template>
<style>
  .texture-field input {
    cursor: default;
  }
</style>
