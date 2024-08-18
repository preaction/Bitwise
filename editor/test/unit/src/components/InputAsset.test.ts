
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import InputAsset from '../../../../src/components/InputAsset.vue';

describe('InputAsset', () => {
  test('shows asset filename as value (path only)', async () => {
    const filename = 'asset.png';
    const dirname = 'path/to';
    const wrapper = mount(InputAsset, {
      props: {
        modelValue: [dirname, filename].join('/'),
      },
    });
    expect(wrapper.text()).toBe(filename);
  });

  test('shows asset filename as value (asset ref)', async () => {
    const filename = 'asset.png';
    const dirname = 'path/to';
    const wrapper = mount(InputAsset, {
      props: {
        modelValue: {
          path: [dirname, filename].join('/'),
        },
      },
    });
    expect(wrapper.text()).toBe(filename);
  });

  test('allow asset drag', async () => {
    const wrapper = mount(InputAsset, {
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

  test('allow asset drop', async () => {
    const dropFilename = "asset.png";
    const dropPath = `path/to/new/${dropFilename}`;
    const wrapper = mount(InputAsset, {
      attachTo: document.body,
    });
    const dropEvent = {
      type: "drop",
      preventDefault: jest.fn(),
      dataTransfer: {
        dropEffect: null,
        getData(type: string) {
          return JSON.stringify({
            path: dropPath,
          });
        },
      },
    };
    wrapper.trigger('drop', dropEvent);
    await flushPromises();
    expect(wrapper.emitted('update:modelValue')?.[0]).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')?.[0][0]).toHaveProperty("path", dropPath);
  });
});
