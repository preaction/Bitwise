<script lang="ts">
import { defineComponent } from "vue";
import { mapStores, mapState, mapGetters, mapActions } from 'pinia';
import { useAppStore } from '../store/app.ts';

export default defineComponent({
  data() {
    return {
      recentProjects: [],
      examples: [],
    };
  },
  emits: [ 'select' ],
  components: {
  },
  async mounted() {
    // Create a copy of the recent projects list so that it doesn't
    // immediately change when we select one
    this.recentProjects = this.appStore.recentProjects.slice();
    this.examples = await electron.listExamples();
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
      return path?.split('/').pop();
    },
    async newProject() {
      await this.appStore.newProject();
      this.$emit('select');
    },
    async openProject( project?:string ) {
      await this.appStore.openProject( project );
      this.$emit('select');
    },
    async openExample( path:string ) {
      await this.appStore.openProject( path );
      this.$emit('select');
    },
  },
});
</script>

<template>
  <div class="project-select">
    <button v-if="hasStoredState" class="resume-project mx-2 btn btn-primary text-start mb-2" @click="loadStoredState">Resume {{storedStateProject}}</button>
    <div class="project-buttons px-2 d-flex flex-column align-items-stretch">
      <button class="btn btn-outline-dark text-start mb-2" @click="newProject">Create Project...</button>
      <button class="btn btn-outline-dark text-start mb-2" @click="openProject()">Open Project...</button>
      <div class="dropdown mb-2">
        <button class="btn btn-outline-dark text-start w-100" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          View Example...
        </button>
        <ul class="dropdown-menu">
          <li v-for="example, i in examples">
            <a class="dropdown-item" href="#" @click="openExample(example.path)">{{example.name}}</a>
          </li>
        </ul>
      </div>
    </div>
    <h4 class="recent-heading px-2 mt-2">Recent Projects</h4>
    <div class="recent-buttons px-2 d-flex flex-column align-items-stretch">
      <button v-for="project in recentProjects" class="btn btn-outline-dark text-start mb-2" @click="openProject(project)">
        {{ projectName(project) }}
      </button>
    </div>
  </div>
</template>

<style>
  .project-select {
    display: grid;
    place-content: stretch;
    grid-template-rows: auto 1fr;
    grid-template-columns: 1fr 1fr;
    grid-template-areas: "restore recent-heading" "buttons recent";
  }
  .resume-project {
    grid-area: restore;
  }
  .project-buttons {
    grid-area: buttons;
  }
  .recent-heading {
    grid-area: recent-heading;
  }
  .recent-buttons {
    grid-area: recent;
  }
</style>
