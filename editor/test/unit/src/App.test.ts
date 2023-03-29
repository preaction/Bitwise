import {describe, expect, test, beforeEach} from '@jest/globals';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { MockElectron } from '../../mock/electron.js';
import App from '../../../src/App.vue';

beforeEach( () => {
  global.electron = new MockElectron();
});

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

