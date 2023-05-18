
import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { mount, flushPromises } from '@vue/test-utils';
import ObjectTreeItem from '../../../../src/components/ObjectTreeItem.vue';

describe('ObjectTreeItem', () => {
  test( 'displays an item', async () => {
    const item = {
      path: "RootNode",
      children: [],
    };
    const wrapper = mount(ObjectTreeItem, {
      props: { item },
    });
    expect( wrapper.get('[data-test=name]').text() ).toBe( item.path );
  } );

  test( 'expand prop displays children', async () => {
    const item = {
      path: "RootNode",
      children: [
        {
          path: "RootNode/ChildNode",
        },
      ],
    };
    const wrapper = mount(ObjectTreeItem, {
      props: { item, expand: true },
    });
    expect( wrapper.get('[data-test=name]').text() ).toBe( item.path );
    const child = wrapper.get('.children').getComponent(ObjectTreeItem);
    expect( child.get('[data-test=name]').text() ).toBe( item.children[0].path.split('/').pop() );
  } );
});

