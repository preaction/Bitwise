import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { MockElectron } from '../../../mock/electron.js';
import SceneEdit from '../../../../src/components/SceneEdit.vue';

beforeEach( () => {
  global.electron = new MockElectron();
});

describe('SceneEdit', () => {
  test( 'create a new scene', async () => {
    const wrapper = mount(SceneEdit, {
      global: {
        plugins: [
          createPinia(),
        ],
      },
    });
    // Click the Save button
    // Verify the scene was saved
  });

});

