import {describe, expect, test, beforeEach} from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
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
  test('shows project dialog', async () => {
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
    await flushPromises();
    await wrapper.vm.$nextTick();
    const modal = wrapper.get('[data-test=project-select-modal]');
    expect( modal ).toBeDefined();
    expect( modal.attributes('class') ).toMatch(/is-open/);
  });
});

