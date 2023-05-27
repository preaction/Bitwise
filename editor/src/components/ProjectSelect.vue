<script lang="ts">
// XXX: Fix ProjectSelect, App, and other tab editors to work with Tab
// objects
import { defineComponent } from "vue";
import MenuButton from './MenuButton.vue';

export default defineComponent({
  inject: ['backend'],
  data() {
    return {
      restoreProject: '',
      recentProjects: [],
      examples: [],
    };
  },
  props: [],
  emits: [ 'select', 'restore' ],
  components: {
    MenuButton,
  },
  async mounted() {
    this.restoreProject = (await this.backend.getState('app', {})).currentProject;
    // Create a copy of the recent projects list so that it doesn't
    // immediately change when we select one
    this.recentProjects = ( await this.backend.listProjects() ).slice(0,3);
    this.examples = await electron.listExamples();
  },
  methods: {
    async loadStoredState() {
      this.$emit('restore');
    },
    projectName( path:string ) {
      return path?.split('/').pop();
    },
    async newProject() {
      const res = await electron.newProject();
      if ( !res.canceled ) {
        this.openProject(res.filePath);
      }
    },
    async openProjectFolder( project?:string ) {
      const res = await electron.openProject();
      if ( !res.canceled ) {
        this.openProject(res.filePaths[0]);
      }
    },
    openProject( project:string ) {
      this.$emit('select', project);
    },
    async openExample( path:string ) {
      this.openProject(path);
    },
  },
});
</script>

<template>
  <div class="project-select">
    <button v-if="restoreProject" class="primary resume-project" @click="loadStoredState"
      data-test="resumeProject"
    >
      Resume {{projectName(restoreProject)}}
    </button>
    <div class="project-buttons">
      <button data-test="newProject" @click="newProject">Create Project...</button>
      <button data-test="openProject" @click="openProjectFolder()">Open Project...</button>
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
