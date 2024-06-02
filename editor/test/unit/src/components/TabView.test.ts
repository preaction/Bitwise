import { describe, expect, test, beforeEach, afterEach, jest, beforeAll } from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { h } from 'vue'

import TabView from '../../../../src/components/TabView.vue';
import Panel from '../../../../src/components/Panel.vue';

describe('TabView', () => {
  const tabElems = [
    {
      label: 'Hello',
      content: 'Hello, World',
      id: 'greet-en_US',
    },
    {
      label: 'Bonjour',
      content: 'Bonjour, tout le monde',
      id: 'greet-fr_FR',
    },
  ];

  let wrapper: VueWrapper;
  beforeEach(async () => {
    wrapper = mount(TabView, {
      slots: {
        default: tabElems.map(
          ({ id, label, content }) => h(Panel, { id, label }, () => content)),
      },
    })
    await wrapper.vm.$nextTick();
  });

  test('shows tab list and panels', () => {
    expect(wrapper.findAll('[role=tablist]')).toHaveLength(1);
    const tabs = wrapper.findAll('[role=tab]')
    expect(tabs).toHaveLength(tabElems.length)
    expect(tabs[0].text()).toBe(tabElems[0].label)
    expect(tabs[0].attributes('aria-controls')).toBe(tabElems[0].id)
    expect(tabs[1].text()).toBe(tabElems[1].label)
    expect(tabs[1].attributes('aria-controls')).toBe(tabElems[1].id)

    const panels = wrapper.findAllComponents(Panel)
    expect(panels[0].attributes('aria-labelledby')).toBeTruthy();
    expect(panels[0].attributes('aria-labelledby')).toBe(tabs[0].attributes('id'))
    expect(panels[1].attributes('aria-labelledby')).toBeTruthy();
    expect(panels[1].attributes('aria-labelledby')).toBe(tabs[1].attributes('id'))
  });

  test('shows first tab by default', () => {
    const tabs = wrapper.findAll('[role=tab]')
    expect(tabs[0].attributes('aria-selected')).toBeTruthy()
    expect(tabs[1].attributes('aria-selected')).toBeFalsy()

    const panels = wrapper.findAll('[role=tabpanel]')
    expect(panels[0].attributes('hidden')).toBeFalsy()
    expect(panels[1].attributes('hidden')).toBeTruthy()
  });

  test('click to show different tab', async () => {
    const tabs = wrapper.findAll('[role=tab]')
    await tabs[1].trigger('click');
    expect(tabs[0].attributes('aria-selected')).toBeFalsy()
    expect(tabs[1].attributes('aria-selected')).toBeTruthy()

    const panels = wrapper.findAll('[role=tabpanel]')
    expect(panels[0].attributes('hidden')).toBeTruthy()
    expect(panels[1].attributes('hidden')).toBeFalsy()
  });
})
