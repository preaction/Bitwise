
import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import InputGameObject from '../../../../src/components/InputGameObject.vue';

describe( 'InputGameObject', () => {
  test('shows asset filename as value', async () => {
    const filename = 'asset.png';
    const dirname = 'path/to';
    const wrapper = mount( InputGameObject, {
      props: {
        modelValue: [ dirname, filename ].join('/'),
      },
    } );
    expect( wrapper.text() ).toBe(filename);
  });

  test('allow asset drag', async () => {
    const wrapper = mount( InputGameObject, {
      attachTo: document.body,
    } );
    const dragEvent = {
      type: "dragover",
      preventDefault: jest.fn(),
      dataTransfer: {
        dropEffect: null,
      },
    };
    wrapper.trigger('dragover', dragEvent);
    expect( dragEvent.dataTransfer.dropEffect ).toBe( 'link' );
  });

  test('allow asset drop', async () => {
    const dropFilename = "asset.png";
    const dropPath = `path/to/new/${dropFilename}`;
    const wrapper = mount( InputGameObject, {
      attachTo: document.body,
    } );
    const dropEvent = {
      type: "drop",
      preventDefault: jest.fn(),
      dataTransfer: {
        dropEffect: null,
        getData(type:string) {
          return dropPath;
        },
      },
    };
    wrapper.trigger('drop', dropEvent);
    await flushPromises();
    expect( wrapper.emitted('update:modelValue')?.[0] ).toHaveLength( 1 );
    expect( wrapper.emitted('update:modelValue')?.[0][0] ).toBe( dropPath );
  });
});
