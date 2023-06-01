<script lang="ts">
import { defineComponent, toRaw } from "vue";
import type Backend from "../Backend.js";
import type Project from "../model/Project.js";
export default defineComponent({
  props: [ 'modelValue' ],
  emits: [ 'update' ],
  inject: ['project', 'backend'],
  data() {
    return {
      release: {
        zip: {
          scene: '',
        },
      },
    };
  },
  async created() {
    const configJson = await this.getBackend().readItemData( this.projectName, 'bitwise.json' );
    if ( configJson ) {
      const config = JSON.parse( configJson );
      this.release = {
        ...this.release,
        ...config.release,
      };
    }
  },
  computed: {
    projectName():string {
      const project = this.project as Project;
      return project.name;
    },
  },
  methods: {
    getBackend():Backend {
      return this.backend as Backend;
    },
    async releaseGame( type:string ) {
      let newConfig = {
        release: toRaw(this.release),
      };
      const configJson = await this.getBackend().readItemData( this.projectName, 'bitwise.json' );
      if ( configJson ) {
        const config = JSON.parse( configJson );
        newConfig = {
          ...config,
          ...newConfig,
        };
      }
      const backend = this.getBackend();
      await Promise.all([
        backend.writeItemData( this.projectName, 'bitwise.json', JSON.stringify(newConfig, null, 2) ),
        backend.releaseProject( this.projectName, 'zip' ),
      ]);
    },
  },
});
</script>

<template>
  <div class="m-2">
    <h5>Release</h5>
    <section id="release-zip">
      <h6>Itch.io Browser Game</h6>
      <div>
        <label class="me-2">Initial Scene</label>
        <InputGameObject data-testid="inputScene" v-model="release.zip.scene" type="scene" style="width: 30vw"/>
      </div>
      <button @click="releaseGame('zip')">Release</button>
    </section>
  </div>
</template>

<style>
</style>
