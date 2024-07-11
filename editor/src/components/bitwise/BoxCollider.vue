<script lang="ts">
import { defineComponent } from "vue";
import BinaryToggle from "../BinaryToggle.vue";
export default defineComponent({
  components: { BinaryToggle },
  props: ['modelValue'],
  data() {
    return {}
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
    <div class="d-flex position align-items-center">
      <span>Origin</span>
      <label>X</label>
      <input @change="update" v-model.number="modelValue.ox" name="ox">
      <label>Y</label>
      <input @change="update" v-model.number="modelValue.oy" name="oy">
      <label>Z</label>
      <input @change="update" v-model.number="modelValue.oz" name="oz">
    </div>
    <div class="d-flex position align-items-center">
      <span>Scale</span>
      <label>X</label>
      <input @change="update" v-model.number="modelValue.sx" name="sx">
      <label>Y</label>
      <input @change="update" v-model.number="modelValue.sy" name="sy">
      <label>Z</label>
      <input @change="update" v-model.number="modelValue.sz" name="sz">
    </div>
    <div class="d-flex align-items-center justify-content-between">
      <label>Is Trigger?</label>
      <BinaryToggle @change="update" on="1" off="0" v-model.number="modelValue.trigger" name="trigger" />
    </div>
  </div>
</template>
<style></style>
