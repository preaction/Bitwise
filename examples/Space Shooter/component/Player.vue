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
      this.$emit('update:modelValue', this.$data);
      this.$emit('update', this.$data);
    },
  },
});
</script>
<template>
  <div>
    <div class="d-flex">
      <label>Weapon</label>
      <InputEntity class="flex-fill" v-model="$data.weapon" type="prefab" @update="update" />
    </div>
  </div>
</template>
<style></style>
