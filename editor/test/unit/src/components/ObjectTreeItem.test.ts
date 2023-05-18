
import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { mount, flushPromises } from '@vue/test-utils';
import ObjectTreeItem from '../../../../src/components/ObjectTreeItem.vue';

describe('ObjectTreeItem', () => {
  test( 'displays an item', async () => {
    const item = {
      path: "RootNode",
      icon: 'fa-file',
      children: [],
    };
    const wrapper = mount(ObjectTreeItem, {
      props: { item },
    });
    expect( wrapper.get('[data-test=name]').text() ).toBe( item.path );
    expect( wrapper.find('.fa.fa-file') ).toBeTruthy();
  } );

  describe( 'display item children', () => {
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
      expect( wrapper.find('.fa.fa-folder-open') ).toBeTruthy();
      const child = wrapper.get('.children').getComponent(ObjectTreeItem);
      expect( child.get('[data-test=name]').text() ).toBe( item.children[0].path.split('/').pop() );
      expect( child.findAll('.fa') ).toHaveLength(0);
    } );
    test( 'expand prop does not allow click to close', async () => {
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
      await wrapper.get('[data-test=name]').trigger('click');
      expect( wrapper.find('.fa.fa-folder-open') ).toBeTruthy();
      const children = wrapper.find('.children');
      expect( children ).toBeTruthy();
      expect( children.findAllComponents(ObjectTreeItem) ).toHaveLength(1);
    } );
  });
});

