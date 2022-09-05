<script lang="ts">
import { defineComponent } from "vue";
import { mapStores } from 'pinia';
import { useAppStore } from "./store/app.ts";

export default defineComponent({
  data() {
    return {};
  },
  computed: {
    ...mapStores(useAppStore),
  },
  created() {
  },
});
</script>

<template>
  <header class="container-fluid bg-dark">
    <nav class="navbar navbar-expand-md navbar-dark bg-dark">
      <a class="navbar-brand" href="#">Bitwise</a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#main-nav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="main-nav">
        <ul class="navbar-nav">
          <li class="nav-item active">
            <router-link to="/" class="nav-link">Project</router-link>
          </li>
          <li class="nav-item">
            <router-link to="/map" class="nav-link">Map</router-link>
          </li>
        </ul>
      </div>
    </nav>
  </header>

  <router-view></router-view>
</template>

<style>
html, body { height: 100% }
#app {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-flow: column;
}
</style>
