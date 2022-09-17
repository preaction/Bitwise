<script lang="ts">
import { defineComponent } from "vue";
import { mapStores, mapState, mapGetters, mapActions } from 'pinia';
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
    ...mapGetters(useAppStore, ['hasStoredState', 'storedStateProject']),
  },
  methods: {
    loadStoredState() {
      this.appStore.loadStoredState();
      this.$emit('select');
    },
    projectName( path:string ) {
      return path.split('/').pop();
    },
    async newProject() {
      await this.appStore.newProject();
      this.$emit('select');
    },
    async openProject( project?:string ) {
      await this.appStore.openProject( project );
      this.$emit('select');
    },
  },
});
</script>

<template>
  <div class="d-flex">
    <div class="flex-fill d-flex flex-column">
      <h4>Recent Projects</h4>

      <button v-for="project in recentProjects" class="btn btn-default text-start" @click="openProject(project)">
        {{ projectName(project) }}
      </button>

    </div>
    <div class="flex-fill d-flex flex-column">
      <button v-if="hasStoredState" class="btn btn-primary text-start" @click="loadStoredState">Resume {{storedStateProject}}</button>
      <button class="btn btn-default text-start" @click="newProject">Create Project...</button>
      <button class="btn btn-default text-start" @click="openProject()">Open Project...</button>
    </div>
  </div>
</template>

<style>
</style>
