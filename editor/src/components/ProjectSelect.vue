<script lang="ts">
// XXX: Fix ProjectSelect, App, and other tab editors to work with Tab
// objects
import { defineComponent } from "vue";
import { mapStores, mapState, mapGetters, mapActions } from 'pinia';
import { useAppStore } from '../store/app.mts';
import MenuButton from './MenuButton.vue';

export default defineComponent({
  inject: ['backend'],
  data() {
    return {
      recentProjects: [],
      examples: [],
    };
  },
  emits: [ 'select' ],
  components: {
    MenuButton,
  },
  async mounted() {
    // Create a copy of the recent projects list so that it doesn't
    // immediately change when we select one
    this.recentProjects = ( await this.backend.listProjects() ).slice(0,3);
    this.examples = await electron.listExamples();
  },
  computed: {
    ...mapStores(useAppStore),
    ...mapGetters(useAppStore, ['hasStoredState', 'storedStateProject']),
  },
  methods: {
    async loadStoredState() {
      await this.appStore.loadStoredState();
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
    <button v-if="hasStoredState" class="primary resume-project" @click="loadStoredState">Resume {{storedStateProject}}</button>
    <div class="project-buttons">
      <button data-test="newProject" @click="newProject">Create Project...</button>
      <button data-test="openProject" @click="openProject()">Open Project...</button>
      <MenuButton title="View Example...">
        <ul>
          <li v-for="example, i in examples" @click="openExample(example.path)">{{example.name}}</li>
        </ul>
      </MenuButton>
    </div>
    <h4 class="recent-heading">Recent Projects</h4>
    <div class="recent-buttons" data-test="recent-projects">
      <button v-for="project in recentProjects" @click="openProject(project)">
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
    gap: 0.3em;
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
  .project-buttons button, .recent-buttons button, .resume-project {
    display: block;
    width: 100%;
    text-align: left;
    margin-bottom: 0.3em;
    padding: 0.3em;
  }
  .resume-project, .project-buttons :last-child, .recent-buttons :last-child {
    margin-bottom: 0;
  }
</style>
