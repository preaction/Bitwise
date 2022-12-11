<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: ['modelValue', 'scene'],
  data() {
    return {
      ...this.modelValue,
    };
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
    <div class="d-flex">
      <label>Damage</label>
      <input class="flex-fill" v-model="$data.damage" @update="update" />
    </div>
    <div class="d-flex">
      <label>Cooldown</label>
      <input class="flex-fill" v-model="$data.cooldown" @update="update" />
    </div>
  </div>
</template>
<style>
</style>
