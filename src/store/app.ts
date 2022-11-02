/**
 * The app store holds on to user preferences and remembers where the
 * user's projects are.
 */

import * as Vue from 'vue';
import { defineStore, acceptHMRUpdate } from 'pinia';
import { loadModule } from 'vue3-sfc-loader';
import Game from '../bitwise/Game.js';
import Component from '../bitwise/Component.js';
import System from '../bitwise/System.js';

// Core Component Forms
import PositionEdit from '../components/bitwise/Position.vue';
import OrthographicCameraEdit from '../components/bitwise/OrthographicCamera.vue';
import SpriteEdit from '../components/bitwise/Sprite.vue';
import RigidBodyEdit from '../components/bitwise/RigidBody.vue';
import BoxColliderEdit from '../components/bitwise/BoxCollider.vue';

// Core System forms
import PhysicsEdit from '../components/bitwise/system/Physics.vue';

type GameConfig = {};

type Tab = {
  data: any,
  edited: boolean,
  src: string,
  icon: string,
  ext: string,
  component: string,
  name: string,
}

type DirectoryItem = {
  name: string,
  ext: string,
  path: string,
  icon: string,
  children?: DirectoryItem[],
};

async function buildTsconfig():Promise<any> {
  const resources = await electron.resourcesPath();
  console.log( 'resources', resources );
  return {
    "compilerOptions": {
      "target": "ESNext",
      "module": "ESNext",
      "moduleResolution": "node",
      "importHelpers": true,
      "jsx": "preserve",
      "esModuleInterop": true,
      "resolveJsonModule": true,
      "sourceMap": true,
      "baseUrl": "./",
      "strict": true,
      "paths": {
        "*": [ "*", ...([ "dist", "node_modules", "src"].map( f => `${resources}/${f}/*` )) ]
      },
      "allowSyntheticDefaultImports": true,
      "skipLibCheck": true,
      "outDir": ".build"
    },
    "include": [ `${resources}/src/env.d.ts`, "**/*" ]
  }
}

function buildGameJs(config:GameConfig, moduleItems:DirectoryItem[]) {
  // We only know plugins, not whether they are components or systems,
  // so we have to load them all and figure out which is what later...
  const imports: { [key:string]: { stmt: string, name: string } } = {};
  for ( const item of moduleItems ) {
    let varname = item.name;
    if ( imports[ varname ] ) {
      let idx = 1;
      while ( imports[ varname + idx ] ) {
        idx++;
      }
      varname = varname + idx;
    }
    imports[varname] = {
      stmt: `import ${varname} from './${item.path}';`,
      name: item.name,
    };
  }

  const gameFile = `
    import Game from 'bitwise/Game.js';
    import System from 'bitwise/System.js';
    import Component from 'bitwise/Component.js';

    // Import custom components and systems
    ${Object.keys(imports).sort().map( k => imports[k].stmt ).join("\n")}
    const mods = [ ${Object.keys(imports).sort().join(', ')} ];
    const modNames = [ ${Object.keys(imports).sort().map( k => `"${imports[k].name}"` ).join(', ')} ];

    const config = ${JSON.stringify( config )};
    config.components = {};
    config.systems = {};

    mods.forEach( (p, i) => {
      const name = modNames[i];
      if ( p.prototype instanceof Component ) {
        config.components[name] = p;
      }
      if ( p.prototype instanceof System ) {
        config.systems[name] = p;
      }
    } );

    export default class MyGame extends Game {
      get config() {
        return config;
      }
    };
  `;

  return gameFile.replaceAll(/\n {4}/g, "\n");
}

const vueLoaderOptions = {
  moduleCache: {
    vue: Vue,
  },
  async getFile(url:string) {
    const res = await fetch(url);
    if ( !res.ok ) {
      throw Object.assign(new Error(res.statusText + ' ' + url), { res });
    }
    return {
      getContentData: (asBinary:boolean) => asBinary ? res.arrayBuffer() : res.text(),
    }
  },
  addStyle(textContent:string) {
    const style = Object.assign(document.createElement('style'), { textContent });
    const ref = document.head.getElementsByTagName('style')[0] || null;
    document.head.insertBefore(style, ref);
  },
};

type AppState = {
  isBuilding: boolean,
  currentProject: null|string,
  recentProjects: string[],
  openTabs: Tab[],
  currentTabIndex: number,
  projectItems: DirectoryItem[],
  icons: { [key:string]: string },
  gameClass: null|typeof Game,
  components: { [key:string]: typeof Component },
  systems: { [key:string]: typeof System },
  componentForms: { [key:string]: any },
  systemForms: { [key:string]: any },
  _fsWatcher: any,
};

export const useAppStore = defineStore('app', {
  state: () => {
    return {
      currentProject: null,
      recentProjects: electron.store.get( 'app', 'recentProjects', [] ),
      openTabs: [
      ],
      currentTabIndex: 0,
      projectItems: [],
      icons: {
        SceneEdit: 'fa-film',
        TilesetEdit: 'fa-grid-2-plus',
        PrefabEdit: 'fa-cubes',
      },
      isBuilding: false,
      _fsWatcher: null,
      gameClass: null,
      components: Vue.markRaw({}),
      systems: Vue.markRaw({}),
      componentForms: Vue.markRaw({
        "Position": PositionEdit,
        "OrthographicCamera": OrthographicCameraEdit,
        "Sprite": SpriteEdit,
        "RigidBody": RigidBodyEdit,
        "BoxCollider": BoxColliderEdit,
      }),
      systemForms: Vue.markRaw({
        "Physics": PhysicsEdit,
      }),
    } as AppState;
  },

  getters: {
    hasSessionState():boolean {
      return !!sessionStorage.getItem('currentProject');
    },
    hasStoredState():boolean {
      return !!electron.store.get( 'app', 'savedState', false );
    },
    storedStateProject() {
      const path = electron.store.get( 'app', 'savedState.currentProject', '' );
      return path.split('/').pop();
    },
  },

  actions: {
    saveSessionState():void {
      sessionStorage.setItem('currentProject', this.currentProject || '');
      sessionStorage.setItem('openTabs', JSON.stringify( this.openTabs ) );
      sessionStorage.setItem('currentTabIndex', this.currentTabIndex.toString());
    },

    async loadSessionState():Promise<void> {
      const currentProject = sessionStorage.getItem('currentProject');
      // Fetch tab info before we open the project. Opening the project
      // will reset the app tabs, so we have to set them after opening.
      const openTabs = sessionStorage.getItem('openTabs');
      const currentTabIndex = sessionStorage.getItem('currentTabIndex');

      if ( !currentProject ) {
        return;
      }

      await this.openProject( currentProject );

      if ( openTabs ) {
        this.openTabs = JSON.parse(openTabs);
      }
      if ( currentTabIndex ) {
        this.showTab( parseInt( currentTabIndex ) );
      }
    },

    async loadStoredState():Promise<void> {
      const state = electron.store.get( 'app', 'savedState', {} );
      if ( !state.currentProject ) {
        return;
      }
      await this.openProject( state.currentProject );
      this.openTabs = state.openTabs;
      this.showTab( state.currentTabIndex );
    },

    saveStoredState() {
      const { currentProject, openTabs, currentTabIndex } = this;
      electron.store.set( 'app', 'savedState', {
        currentProject: Vue.toRaw(currentProject),
        openTabs: Vue.toRaw(openTabs),
        currentTabIndex: Vue.toRaw(currentTabIndex),
      } );
    },

    showTab( index:number ) {
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

    async openProject( path:string='' ) {
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
      electron.store.set( 'app', 'recentProjects', Vue.toRaw(this.recentProjects) );

      // Load up project files
      await this.readProject();
      await this.buildProject();

      this._fsWatcher = this.changeFile.bind(this);
      electron.on( 'watch', this._fsWatcher );
    },

    changeFile(event:any, {eventType, filename}:{eventType:string, filename:string}) {
      console.log( 'file changed', eventType, filename );
      this.readProject();
      if ( !filename.match(/^\./) && filename.match( /\.[tj]s$/ ) ) {
        this.buildProject();
      }
    },

    async readProject() {
      if ( !this.currentProject ) {
        return;
      }
      // XXX: Map component to icon class
      this.projectItems = await electron.readProject(this.currentProject)
        .then( async items => {
          const ignore = (item:DirectoryItem) => {
            return !item.path.match( /(?:^|\/)\./ ) && !item.path.match(/^(tsconfig|bitwise\.config)\.json$/);
          };
          const descend = async (item:DirectoryItem) => {
            if ( item.children && item.children.length ) {
              // Descend
              item.children = await Promise.all( item.children.filter( ignore ).map(i => descend(i)) );
            }
            else if ( item.ext.match( /\.(?:png|jpe?g|gif)$/ ) ) {
              item.icon = 'fa-image';
            }
            else if ( item.ext.match( /\.json$/ ) ) {
              const json = await this.readFile( item.path );
              const data = JSON.parse( json );
              const comp = data.component;
              item.icon = this.icons[ comp ];
            }
            return item;
          };
          return Promise.all( items.filter( ignore ).map( descend ) );
        });
    },

    async buildProject() {
      if ( !this.currentProject ) {
        return;
      }
      this.isBuilding = true;
      // Build 'bitwise.js' file from the files read:
      //  - All systems and components found should be loaded
      //  - bitwise.config.json should be loaded and merged
      const findModules:((items:DirectoryItem[]) => DirectoryItem[]) = (items) => {
        const mods = [];
        for ( const i of items ) {
          if ( i.name.match(/^\./) ) {
            continue;
          }
          if ( i.path.match(/\.[tj]s$/) ) {
            mods.push(i);
          }
          if ( i.children ) {
            mods.push( ...findModules( i.children ) );
          }
        }
        return mods;
      };
      const modules = findModules( this.projectItems );
      let gameConf = {};
      try {
        const confJson = await electron.readFile( this.currentProject + '/bitwise.config.json' );
        gameConf = JSON.parse(confJson);
      }
      catch (e) {
        console.warn( `Could not read project config: ${e}` );
      }

      const gameJs = buildGameJs( gameConf, modules );
      await electron.saveFile( this.currentProject + '/.bitwise.js', gameJs );

      // Build and load project game class
      try {
        await electron.buildProject( this.currentProject, '.bitwise.js', '.build/game.js' );
      }
      catch (e) {
        console.error( `Could not build project: ${e}` );
      }
      try {
        const mod = await import( /* @vite-ignore */ 'bfile://' + this.currentProject + '/.build/game.js' );
        this.gameClass = mod.default;
        console.log( 'Game class:', this.gameClass );
      }
      catch (e) {
        console.error( `Could not load game class: ${e}` );
      }

      if ( this.gameClass ) {
        const game = new this.gameClass({});
        this.components = game.components;
        this.systems = game.systems;
        for ( const name in game.components ) {
          const component = game.components[name];
          if ( component.editorComponent ) {
            console.log( `Loading editor component ${name}: ${component.editorComponent}` );
            const path = this.currentProject + '/' + component.editorComponent;
            this.componentForms[name] = await loadModule( `bfile://${path}`, vueLoaderOptions );
          }
        }

        for ( const name in game.systems ) {
          const system = game.systems[name];
          if ( system.editorComponent ) {
            console.log( `Loading editor component ${name}: ${system.editorComponent}` );
            const path = this.currentProject + '/' + system.editorComponent;
            this.systemForms[name] = await loadModule( `bfile://${path}`, vueLoaderOptions );
          }
        }
      }

      this.isBuilding = false;
    },

    saveProject() {
    },

    async newProject() {
      const res = await electron.newProject();
      const tsconfig = await buildTsconfig();
      await electron.saveFile( res.filePath + '/tsconfig.json', JSON.stringify(tsconfig) );
      this.openProject(res.filePath);
    },

    getFileUrl( path:string ):string {
      if ( !this.currentProject ) {
        throw "No current project";
      }
      return 'bfile://' + this.currentProject + '/' + Vue.toRaw(path);
    },

    readFile( path:string ) {
      if ( !this.currentProject ) {
        throw "No current project";
      }
      return electron.readFile( this.currentProject + '/' + path );
    },

    saveFile( path:string, data:Object ) {
      if ( !this.currentProject ) {
        throw "No current project";
      }
      return electron.saveFile( this.currentProject + '/' + path, data )
        .then( res => {
          // XXX: Oh, this is just absolutely wrong: We're not always
          // saving only the current tab when we run saveFile()
          const tab = this.openTabs[ this.currentTabIndex ];
          tab.edited = false;

          this.saveSessionState();
          this.saveStoredState();
        } );
    },

    newFile( name:string, ext:string, data:Object ) {
      if ( !this.currentProject ) {
        throw "No current project";
      }
      const project = this.currentProject;
      return electron.newFile( this.currentProject, name, ext, data )
        .then( res => {
          if ( !res.canceled ) {
            const name = res.filePath.split('/').pop() as string;
            const tab = this.openTabs[ this.currentTabIndex ];
            tab.name = name;
            tab.src = res.filePath.replace( project, '' );
            tab.edited = false;

            this.saveSessionState();
            this.saveStoredState();
          }
        });
    },

    openEditor( path:string ) {
      if ( !this.currentProject ) {
        throw "No current project";
      }
      return electron.openEditor( this.currentProject, path );
    },

    deleteTree( path:string ) {
      if ( !this.currentProject ) {
        throw "No current project";
      }
      // XXX: Pre-delete item from projectItems
      return electron.deleteTree( this.currentProject, path );
    },

    renamePath( path:string, dest:string ) {
      if ( !this.currentProject ) {
        throw "No current project";
      }
      // XXX: Pre-move item in projectItems
      return electron.renamePath( this.currentProject, path, dest );
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
