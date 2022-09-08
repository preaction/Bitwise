<script lang="ts">
import { defineComponent } from "vue";
import { mapStores, mapState } from 'pinia';
import { useAppStore } from '../store/app.ts';

export default defineComponent({
  data() {
    return {
      recentProjects: [],
    };
  },
  emits: [ 'select' ],
  components: {
  },
  mounted() {
    // Create a copy of the recent projects list so that it doesn't
    // immediately change when we select one
    this.recentProjects = this.appStore.recentProjects.slice();
  },
  computed: {
    ...mapStores(useAppStore),
  },
  methods: {
    projectName( path:string ) {
      return path.split('/').pop();
    },
    async newProject() {
      await this.appStore.newProject();
      this.$emit('select');
    },
    async openProject( project:string ) {
      await this.appStore.openProject( project );
      this.$emit('select');
    },
  },
});
</script>

<template>
  <div class="d-flex">
    <div class="flex-fill">
      <h4>Recent Projects</h4>

      <button v-for="project in recentProjects" class="btn btn-default d-block" @click="openProject(project)">
        {{ projectName(project) }}
      </button>

    </div>
    <div class="flex-fill">
      <h4>Create Project</h4>
      <button class="btn btn-default" @click="newProject">Create...</button>
    </div>
  </div>
</template>

<style>
</style>
