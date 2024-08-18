
import { describe, expect, test, jest } from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import InputEntity from '../../../../src/components/InputEntity.vue';

describe('InputEntity', () => {
  test('shows entity name as value', async () => {
    const name = 'Entity';
    const dirname = 'path/to';
    const wrapper = mount(InputEntity, {
      props: {
        modelValue: [dirname, name].join('/'),
      },
    });
    expect(wrapper.text()).toBe(name);
  });

  test('allow entity drag', async () => {
    const wrapper = mount(InputEntity, {
      attachTo: document.body,
    });
    const dragEvent = {
      type: "dragover",
      preventDefault: jest.fn(),
      dataTransfer: {
        dropEffect: null,
      },
    };
    wrapper.trigger('dragover', dragEvent);
    expect(dragEvent.dataTransfer.dropEffect).toBe('link');
  });

  test('allow entity drop', async () => {
    const dropName = "Entity";
    const dropPath = `path/to/new/${dropName}`;
    const wrapper = mount(InputEntity, {
      attachTo: document.body,
    });
    const dropEvent = {
      type: "drop",
      preventDefault: jest.fn(),
      dataTransfer: {
        dropEffect: null,
        getData(type: string) {
          return dropPath;
        },
      },
    };
    wrapper.trigger('drop', dropEvent);
    await flushPromises();
    expect(wrapper.emitted('update:modelValue')?.[0]).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')?.[0][0]).toBe(dropPath);
  });
});
