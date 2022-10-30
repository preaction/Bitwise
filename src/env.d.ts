/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

type DirectoryItem = {
  path: string,
  name: string,
  ext: string,
  icon: string,
  children?: DirectoryItem[],
};

type SaveDialog = {
  canceled: boolean,
  filePath: string,
  bookmark?: string,
};

type OpenDialog = {
  canceled: boolean,
  filePaths: string[],
  bookmarks?: string[],
};

declare var electron: {
  store: {
    get: (file: string, key: string, def?: any) => any;
    set: (file: string, key: string, val: any) => void;
    // any other methods you've defined...
  },
  resourcesPath:() => Promise<string>,
  openProject: () => Promise<OpenDialog>;
  newProject: () => Promise<SaveDialog>;
  readProject: (path: string) => Promise<DirectoryItem[]>;
  readFile: (path: string) => Promise<string>;
  newFile: ( path:string, name:string, ext:string, data:any ) => Promise<SaveDialog>;
  saveFile: ( path:string, data:any ) => Promise<SaveDialog>;
  on: ( channel:string, cb:Function ) => void;
  removeListener: ( channel:string, cb:Function ) => void;
  deleteTree: ( root:string, path:string ) => Promise<void>;
  buildProject: ( root:string, src:string, dest:string ) => Promise<string>;
  openEditor: ( root:string, file:string ) => Promise<string>;
};

declare module 'vue3-sfc-loader' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  function loadModule( url:string, options:any ):Promise<component>;
}

declare module 'ammo.js' {
  var Ammo:any;
  export = Ammo;
}

