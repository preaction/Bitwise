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
    _fsWatcher: null,
  }),

  getters: {
    hasSessionState() {
      return !!sessionStorage.getItem('currentProject');
    },
    hasStoredState() {
      return !!electron.store.get( 'app', 'savedState', false );
    },
    storedStateProject() {
      const path = electron.store.get( 'app', 'savedState.currentProject', '' );
      return path.split('/').pop();
    },
  },

  actions: {
    saveSessionState() {
      sessionStorage.setItem('currentProject', this.currentProject);
      sessionStorage.setItem('openTabs', JSON.stringify( this.openTabs ) );
      sessionStorage.setItem('currentTabIndex', this.currentTabIndex);
    },

    loadSessionState() {
      const currentProject = sessionStorage.getItem('currentProject');
      const openTabs = JSON.parse( sessionStorage.getItem('openTabs') );
      const currentTabIndex = sessionStorage.getItem('currentTabIndex');

      if ( !currentProject ) {
        return;
      }

      this.openProject( currentProject );
      this.openTabs = openTabs;
      this.showTab( currentTabIndex );
    },

    loadStoredState() {
      const state = electron.store.get( 'app', 'savedState', {} );
      if ( !state.currentProject ) {
        return;
      }
      this.openProject( state.currentProject );
      this.openTabs = state.openTabs;
      this.showTab( state.currentTabIndex );
    },

    saveStoredState() {
      const { currentProject, openTabs, currentTabIndex } = this;
      console.log( toRaw(openTabs) );
      electron.store.set( 'app', 'savedState', {
        currentProject: toRaw(currentProject),
        openTabs: toRaw(openTabs),
        currentTabIndex: toRaw(currentTabIndex),
      } );
    },

    showTab( index:Number ) {
      this.currentTabIndex = index;
      this.saveSessionState();
      this.saveStoredState();
    },

    openTab( tab:Tab ) {
      // XXX: If tab lacks icon, add icon based on Component
      console.log( 'open tab', tab );
      this.openTabs.push( tab );
      this.showTab( this.openTabs.length - 1 );
    },

    closeTab( tab:Tab ) {
      for ( let i = 0; i < this.openTabs.length; i++ ) {
        if ( this.openTabs[i] === tab ) {
          this.openTabs.splice(i, 1);
          if ( this.currentTabIndex >= this.openTabs.length ) {
            this.showTab( this.openTabs.length - 1 );
          }
          break;
        }
      }
      this.saveSessionState();
      this.saveStoredState();
    },

    async openProject( path:string=null ) {
      if ( this._fsWatcher ) {
        electron.removeListener( 'watch', this._fsWatcher );
      }
      if ( !path ) {
        const res = await electron.openProject();
        path = res.filePaths[0];
      }
      this.currentProject = path;

      this.saveSessionState();
      this.saveStoredState();

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
      this.readProject();
      this.projectItems = await electron.readProject(path);

      this._fsWatcher = this.changeFile.bind(this);
      electron.on( 'watch', this._fsWatcher );
    },

    changeFile(event, {eventType, filename}) {
      console.log( 'file changed', eventType, filename );
      this.readProject();
    },

    async readProject() {
      // XXX: Map component to icon class
      this.projectItems = await electron.readProject(this.currentProject)
        .then( items => {
          const descend = item => {
            // XXX: Set icon
            // Descend
            if ( item.children ) {
              item.children = item.children.map(descend);
            }
            return item;
          };
          return items.map(descend);
        });
    },

    saveProject() {
    },

    async newProject() {
      const res = await electron.newProject();
      this.openProject(res.filePath);
    },

    getFileUrl( path:string ):string {
      console.log( 'getFileUrl', toRaw(path) );
      return 'bfile://' + this.currentProject + '/' + toRaw(path);
    },

    readFile( path:string ) {
      return electron.readFile( this.currentProject + '/' + path );
    },

    saveFile( path:string, data:Object ) {
      return electron.saveFile( this.currentProject + '/' + path, data )
        .then( res => {
          const tab = this.openTabs[ this.currentTabIndex ];
          tab.edited = false;

          this.saveSessionState();
          this.saveStoredState();
        } );
    },

    newFile( name:string, ext:string, data:Object ) {
      return electron.newFile( this.currentProject, name, ext, data )
        .then( res => {
          if ( !res.canceled ) {
            const name = res.filePath.split('/').pop();
            const tab = this.openTabs[ this.currentTabIndex ];
            tab.name = name;
            tab.src = res.filePath.replace( this.currentProject, '' );
            tab.edited = false;

            this.saveSessionState();
            this.saveStoredState();
          }
        });
    },

    deleteTree( path:string ) {
      // XXX: Pre-delete item from projectItems
      return electron.deleteTree( this.currentProject, path );
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
