import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { MockElectron } from '../../../mock/electron.js';
import { Game } from '@fourstar/bitwise';
import Project from '../../../../src/model/Project.js';
import MockBackend from'../../../mock/backend.js';
import SceneEdit from '../../../../src/components/SceneEdit.vue';

let backend:MockBackend, project:Project;
beforeEach( () => {
  global.electron = new MockElectron();
  backend = new MockBackend();
  project = new Project( backend, "testProject" );
});

describe('SceneEdit', () => {
  test( 'create a new scene', async () => {
    const wrapper = mount(SceneEdit, {
      global: {
        provide: {
          backend,
          project,
          baseUrl: 'testProject',
          isBuilding: false,
          gameClass: Game,
        },
        plugins: [
          createPinia(),
        ],
      },
    });
    // Click the Save button
    // Verify the scene was saved
  });

});

