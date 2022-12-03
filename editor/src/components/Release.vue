<script lang="ts">
import { defineComponent, toRaw } from "vue";
import { mapStores } from 'pinia';
import { useAppStore } from "../store/app";
export default defineComponent({
  data() {
    return {
      release: {
        zip: {
          scene: '',
        },
      },
      ...this.$modelValue,
    };
  },
  computed: {
    ...mapStores(useAppStore),
  },
  methods: {
    update() {
      this.$emit('update:modelValue', { ...toRaw( this.$data )});
    },
    async releaseGame( type:string ) {
      this.update();
      await this.appStore.saveFile( 'bitwise.json', JSON.stringify( toRaw( this.$data ) ) );
      await this.appStore.releaseProject( 'zip' );
    },
  },
});
</script>

<template>
  <div class="m-2">
    <h5>Release</h5>
    <section>
      <h6>Itch.io Browser Game</h6>
      <div>
        <label class="me-2">Initial Scene</label>
        <InputGameObject v-model="release.zip.scene" type="scene" style="width: 30vw"/>
      </div>
      <button @click="releaseGame('zip')">Release</button>
    </section>
  </div>
</template>

<style>
</style>
