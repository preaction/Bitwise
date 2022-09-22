<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ['modelValue'],
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
  },
});
</script>
<template>
  <div>
    <h6>Position</h6>
    <div class="d-flex">
      <div>
        <label>X
          <input @change="update" v-model="$data.x">
        </label>
      </div>
      <div>
        <label>Y
          <input @change="update" v-model="$data.y">
        </label>
      </div>
      <div>
        <label>Z
          <input @change="update" v-model="$data.z">
        </label>
      </div>
    </div>
  </div>
</template>
<style>
</style>
