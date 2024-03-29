/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

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
  platform: () => Promise<string>,
  store: {
    get: (file: string, key: string, def?: any) => any;
    set: (file: string, key: string, val: any) => void;
    // any other methods you've defined...
  },
  resourcesPath:() => Promise<string>,
  openProject: () => Promise<OpenDialog>;
  newProject: () => Promise<SaveDialog>;
  readProject: (path: string) => Promise<DirectoryItem[]>;
  readFile: (root: string, path: string) => Promise<string>;
  newFile: ( path:string, name:string, ext:string ) => Promise<SaveDialog>;
  saveFile: (root: string, path:string, data:any ) => Promise<void>;
  on: ( channel:string, cb:Function ) => void;
  removeListener: ( channel:string, cb:Function ) => void;
  deleteTree: ( root:string, path:string ) => Promise<void>;
  renamePath: ( root:string, path:string, dest:string ) => Promise<void>;
  buildProject: ( root:string ) => Promise<string>;
  releaseProject: ( root:string, type:string ) => Promise<string>;
  openEditor: ( root:string, file:string ) => Promise<string>;
  listExamples: () => Promise<string[]>;
  importFiles: ( root:string ) => Promise<string[]>;
};

declare module 'vue3-sfc-loader' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  function loadModule( url:string, options:any ):Promise<component>;
}
