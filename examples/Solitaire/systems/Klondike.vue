<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: ['modelValue', 'scene'],
  data() {
    return {
      deckEntityPath: '',
      discardEntityPath: '',
      menuButtonEntityPath: '',
      menuEntityPath: '',
      ...this.modelValue,
    };
  },
  watch: {
    // XXX: It is annoying to have to manually emit the update event
    // here...
    deckEntityPath() {
      this.update();
    },
    discardEntityPath() {
      this.update();
    },
    menuButtonEntityPath() {
      this.update();
    },
    menuEntityPath() {
      this.update();
    },
  },
  methods: {
    update() {
      this.$emit( 'update:modelValue', this.$data );
      this.$emit( 'update', this.$data );
    },
  },
});
</script>
<template>
  <div>
    <div class="d-flex justify-content align-items-center">
      <label class="me-1">Deck</label>
      <InputGameObject v-model="deckEntityPath" type="entity" drop-effect="link" />
    </div>
    <div class="d-flex justify-content align-items-center">
      <label class="me-1">Discard</label>
      <InputGameObject v-model="discardEntityPath" type="entity" drop-effect="link" />
    </div>
    <div class="d-flex justify-content align-items-center">
      <label class="me-1">Menu Button</label>
      <InputGameObject v-model="menuButtonEntityPath" type="entity" drop-effect="link" />
    </div>
    <div class="d-flex justify-content align-items-center">
      <label class="me-1">Menu</label>
      <InputGameObject v-model="menuEntityPath" type="entity" drop-effect="link" />
    </div>
  </div>
</template>
<style>
</style>
