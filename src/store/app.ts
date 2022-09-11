/**
 * The app store holds on to user preferences and remembers where the
 * user's projects are.
 */

import { toRaw } from 'vue';
import { defineStore, acceptHMRUpdate } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    currentProject: null,
    recentProjects: electron.store.get( 'app', 'recentProjects', [] ),
    openTabs: [
    ],
    currentTabIndex: 0,
    projectItems: [],
  }),

  actions: {
    showTab( index:Number ) {
      this.currentTabIndex = index;
    },
    openTab( tab:Tab ) {
      console.log( 'open tab', tab );
      this.openTabs.push( tab );
      this.showTab( this.openTabs.length - 1 );
    },
    async openProject( path:string=null ) {
      if ( !path ) {
        const res = await electron.openProject();
        path = res.filePaths[0];
      }
      this.currentProject = path;

      // Update the recent projects list
      const i = this.recentProjects.indexOf( path );
      if ( i >= 0 ) {
        this.recentProjects.splice(i, 1);
      }
      this.recentProjects.unshift( path );
      // Keep the last few projects only
      this.recentProjects.length = Math.min( this.recentProjects.length, 5 );
      electron.store.set( 'app', 'recentProjects', toRaw(this.recentProjects) );

      // Load up project files
      this.projectItems = await electron.readProject(path);
    },
    saveProject() {
    },
    async newProject() {
      const res = await electron.newProject();
      this.openProject(res.filePath);
    },
    getFileUrl( path:string ):string {
      console.log( 'getFileUrl', path );
      return 'bfile://' + this.currentProject + '/' + path;
    },
    getFile( path:string ) {
    },
    saveFile( path:string, data:Object ) {
      electron.saveFile( this.currentProject + '/' + path, data );
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
