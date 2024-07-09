<script lang="ts" setup>
import { inject, onMounted, ref, watch, type Ref } from "vue";
import type Project from "../model/Project";
import type { ConfigFile } from "../types";

const CONFIG_FILE = 'bitwise.json';
const project = inject<Ref<Project>>('project') as Ref<Project>;

const defaultConfig: ConfigFile = {
  game: {
    renderer: {
      width: 1024,
      height: 768,
      pixelScale: 128,
    },
  },
};
let config = ref(defaultConfig);

onMounted(async () => {
  try {
    const loadConfig = JSON.parse(await project.value.readItemData(CONFIG_FILE));
    config.value = loadConfig;
    config.value.game ??= defaultConfig.game;
    config.value.game.renderer ??= defaultConfig.game.renderer;
  }
  catch (err) {
    console.log(`Error loading game config: ${err}`);
  }
});

let edited = false;
watch(config, () => { edited = true }, { deep: true });
async function save() {
  await project.value.writeItemData(CONFIG_FILE,
    JSON.stringify(config.value));
}
</script>

<template>
  <form @submit.prevent="save">
    <div class="m-2">
      <button :disabled="!edited" data-test="save">Save</button>
      <fieldset>
        <legend>Renderer</legend>
        <div class="form-group">
          <label for="width">Width</label>
          <input id="width" v-model.number="config.game.renderer.width" />
        </div>
        <div class="form-group">
          <label for="height">Height</label>
          <input id="height" v-model.number="config.game.renderer.height" />
        </div>
        <div class="form-group">
          <label for="pixel-scale">Pixel Scale</label>
          <input id="pixel-scale" v-model.number="config.game.renderer.pixelScale" />
        </div>
      </fieldset>
    </div>
  </form>
</template>

<style>
.form-group {
  display: flex;
}
</style>
