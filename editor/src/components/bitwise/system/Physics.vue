<script lang="ts">
import { defineComponent } from "vue";
//import { Physics } from '@fourstar/bitwise/system';

export default defineComponent({
  props: ['modelValue', 'scene'],
  data() {
    const data = {
      broadphaseOptions: { AxisSweep: 0, Dbvt: 1 },
      gx: 0,
      gy: 0,
      gz: 0,
      broadphase: 0,
      ...this.modelValue,
    };
    console.log( 'System form init', data );
    return data;
  },
  methods: {
    update() {
      console.log( 'System form update', this.$data );
      this.$emit( 'update:modelValue', this.$data );
      this.$emit( 'update', this.$data );
    },
  },
});
</script>
<template>
  <div>
    <div class="d-flex gravity align-items-center">
      <span>Gravity</span>
      <label>X</label>
      <input @change="update" v-model="$data.gx">
      <label>Y</label>
      <input @change="update" v-model="$data.gy">
      <label>Z</label>
      <input @change="update" v-model="$data.gz">
    </div>
    <div class="d-flex position align-items-center justify-content-between">
      <span>Broadphase</span>
      <select v-model="$data.broadphase" @change="update">
        <option :value="broadphaseOptions.AxisSweep">Axis Sweep</option>
        <option :value="broadphaseOptions.Dbvt">DBVT</option>
      </select>
    </div>
  </div>
</template>
<style>
  .gravity label {
    padding: 0 2px;
  }
  .gravity input {
    margin: 0 4px 0 0;
    flex: 1 1 auto;
    width: 2em;
    text-align: right;
  }
</style>
