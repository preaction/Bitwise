import {describe, expect, test, beforeEach} from '@jest/globals';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { MockElectron } from '../../mock/electron.js';
import MockBackend from'../../mock/backend.js';
import App from '../../../src/App.vue';

let backend:MockBackend;
beforeEach( () => {
  global.electron = new MockElectron();
  backend = new MockBackend();
});

describe('App', () => {
  // Inspect the raw component options
  test('has data', () => {
    expect(typeof App.data).toBe('function')
  });
  test('shows project dialog', () => {
    const wrapper = mount(App, {
      provide: {
        backend,
      },
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

