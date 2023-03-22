import {describe, expect, test} from '@jest/globals';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import App from '../../../src/App.vue';

// XXX: Set up proper mock
global.electron = {
  store: {
    get( file:string, key:string, defaultValue:any ):any {
      return defaultValue;
    },
    set( file:string, key:string, val:any ) {
    },
  },
  isMac: false,
  isLinux: false,
  isWindows: false,
  resourcesPath:() => new Promise( () => "" ),
  openProject: () => new Promise( () => ({ canceled: false, filePaths: [] }) ),
  newProject: () => new Promise( () => ({ canceled: false, filePath: "" }) ),
  readProject: (path:string) => new Promise( () => [] ),
  readFile: (path: string) => new Promise( () => "" ),
  newFile: ( path:string, name:string, ext:string, data:any ) => new Promise( () => ({ canceled: false, filePath: "" }) ),
  saveFile: ( path:string, data:any ) => new Promise( () => ({ canceled: false, filePath: "" }) ),
  on: ( channel:string, cb:Function ) => null,
  removeListener: ( channel:string, cb:Function ) => null,
  deleteTree: ( root:string, path:string ) => new Promise( () => null ),
  renamePath: ( root:string, path:string, dest:string ) => new Promise( () => null ),
  buildProject: ( root:string ) => new Promise( () => "" ),
  releaseProject: ( root:string, type:string ) => new Promise( () => "" ),
  openEditor: ( root:string, file:string ) => new Promise( () => "" ),
  listExamples: () => new Promise( () => [""] ),
  importFiles: ( root:string ) => new Promise( () => ({canceled: false, filePaths: [""] }) ),
};

describe('App', () => {
  // Inspect the raw component options
  test('has data', () => {
    expect(typeof App.data).toBe('function')
  });
  test('shows project dialog', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [
          createPinia(),
        ],
      },
    });
    const modal = wrapper.get('[data-test=project-select]');
    expect( modal ).toBeDefined();
    expect( modal.attributes( 'aria-hidden' ) ).toBeFalsy();
  });
});

