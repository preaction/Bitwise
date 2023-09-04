
import {describe, expect, test, beforeEach, jest} from '@jest/globals';
import { mount, flushPromises } from '@vue/test-utils';
import AssetTree from '../../../../src/components/AssetTree.vue';
import {Asset, Load} from '@fourstar/bitwise';

let asset:Asset;
beforeEach( () => {
  asset = new Asset(new Load(), { path: "RootNode" });
  asset.children = [
    new Asset( asset.load, { path: "RootNode/ChildNode" } ),
  ];
});

describe('AssetTree', () => {
  test( 'displays an asset', async () => {
    const wrapper = mount(AssetTree, {
      props: { asset },
    });
    expect( wrapper.get('[data-test=name]').text() ).toBe( asset.path );
    expect( wrapper.find('.fa.fa-file') ).toBeTruthy();
  } );

  describe( 'display asset children', () => {
    test( 'expand prop displays children', async () => {
      const wrapper = mount(AssetTree, {
        props: { asset, expand: true },
      });
      expect( wrapper.get('[data-test=name]').text() ).toBe( asset.path );
      expect( wrapper.find('.fa.fa-folder-open') ).toBeTruthy();
      const child = wrapper.get('.children').getComponent(AssetTree);
      expect( child.get('[data-test=name]').text() ).toBe( asset.children?.[0].path.split('/').pop() );
      expect( child.findAll('.fa') ).toHaveLength(0);
    } );
    test( 'expand prop does not allow click to close', async () => {
      const wrapper = mount(AssetTree, {
        props: { asset, expand: true },
      });
      await wrapper.get('[data-test=name]').trigger('click');
      expect( wrapper.find('.fa.fa-folder-open') ).toBeTruthy();
      const children = wrapper.find('.children');
      expect( children ).toBeTruthy();
      expect( children.findAllComponents(AssetTree) ).toHaveLength(1);
    } );

    test('expand children by clicking expand button', async () => {
      const wrapper = mount(AssetTree, {
        props: { asset },
      });
      await wrapper.get('[data-path="RootNode"] .show-children').trigger('click');
      expect( wrapper.find('.fa.fa-folder-open') ).toBeTruthy();
      const children = wrapper.find('.children');
      expect( children ).toBeTruthy();
      expect( children.findAllComponents(AssetTree) ).toHaveLength(1);
    });

  });

  describe( 'onclick', () => {
    test( 'runs an onclick handler', async () => {
      const onclick = jest.fn();
      const wrapper = mount(AssetTree, {
        props: { asset, onclick },
      });
      await wrapper.get('[data-path=RootNode]').trigger('click');
      expect( onclick ).toHaveBeenCalledTimes(1);
      expect( onclick ).toHaveBeenCalledWith( asset );
    });

    test( 'runs an onclick handler when an ondblclick handler is present', async () => {
      const onclick = jest.fn();
      const ondblclick = jest.fn();
      const wrapper = mount(AssetTree, {
        props: { asset, onclick, ondblclick },
      });
      await wrapper.get('[data-path=RootNode]').trigger('click');
      await new Promise( (resolve) => setTimeout( resolve, 500 ) );
      expect( onclick ).toHaveBeenCalledTimes(1);
      expect( onclick ).toHaveBeenCalledWith( asset );
      expect( ondblclick ).not.toHaveBeenCalled();
    });

    test('expanding children does not run onclick handler', async () => {
      const onclick = jest.fn();
      const wrapper = mount(AssetTree, {
        props: { asset, onclick },
      });
      await wrapper.get('[data-path="RootNode"] .show-children').trigger('click');
      expect( onclick ).not.toHaveBeenCalled();
    });

    test('runs an onclick handler in child asset', async () => {
      const onclick = jest.fn();
      const wrapper = mount(AssetTree, {
        props: { asset, onclick, expand: true },
      });
      await wrapper.get('[data-path="RootNode/ChildNode"]').trigger('click');
      expect( onclick ).toHaveBeenCalledTimes(1);
      expect( onclick ).toHaveBeenCalledWith( asset.children?.[0] );
    });

  });

  describe( 'ondblclick', () => {
    test( 'runs an ondblclick handler', async () => {
      const ondblclick = jest.fn();
      const wrapper = mount(AssetTree, {
        props: { asset, ondblclick },
      });
      await wrapper.get('[data-path=RootNode]').trigger('dblclick');
      expect( ondblclick ).toHaveBeenCalledTimes(1);
      expect( ondblclick ).toHaveBeenCalledWith( asset );
    });

    test( 'runs an ondblclick handler when an onclick handler is present', async () => {
      const onclick = jest.fn();
      const ondblclick = jest.fn();
      const wrapper = mount(AssetTree, {
        props: { asset, onclick, ondblclick },
      });
      await wrapper.get('[data-path=RootNode]').trigger('click');
      await wrapper.get('[data-path=RootNode]').trigger('dblclick');
      expect( ondblclick ).toHaveBeenCalledTimes(1);
      expect( ondblclick ).toHaveBeenCalledWith( asset );
      expect( onclick ).not.toHaveBeenCalled();
    });

    test('runs an ondblclick handler in child asset', async () => {
      const ondblclick = jest.fn();
      const wrapper = mount(AssetTree, {
        props: { asset, ondblclick, expand: true },
      });
      await wrapper.get('[data-path="RootNode/ChildNode"]').trigger('dblclick');
      expect( ondblclick ).toHaveBeenCalledTimes(1);
      expect( ondblclick ).toHaveBeenCalledWith( asset.children?.[0] );
    });
  });

  describe( 'drag/drop', () => {
    let dragEvent:DragEvent;
    beforeEach( () => {
      dragEvent = {
        type: "dragover",
        preventDefault: jest.fn(),
        dataTransfer: {
          dropEffect: "none",
          setData: jest.fn(),
        } as unknown as DataTransfer,
      } as unknown as DragEvent;
    });

    test('dragging an asset uses asset ref', async () => {
      const wrapper = mount(AssetTree, {
        props: { asset },
      });
      await wrapper.get('[data-path=RootNode]').trigger('dragstart', dragEvent);
      expect( dragEvent.dataTransfer?.setData ).toHaveBeenCalledWith( "bitwise/asset", asset.ref() );
    });

    test('dragover calls ondragover handler', async () => {
      const ondragover = jest.fn();
      const ondrop = jest.fn();
      const wrapper = mount(AssetTree, {
        props: { asset, ondragover, ondrop },
      });
      await wrapper.get('[data-path=RootNode]').trigger('dragover', dragEvent);
      expect( ondragover ).toHaveBeenCalledTimes(1);
      expect( ondragover.mock.lastCall?.[0] ).toBeInstanceOf( Event );
      expect( ondragover.mock.lastCall?.[1] ).toStrictEqual( asset );
    });

    test('dropping calls ondrop handler', async () => {
      const ondrop = jest.fn();
      const wrapper = mount(AssetTree, {
        props: { asset, ondrop },
      });
      await wrapper.get('[data-path=RootNode]').trigger('drop', dragEvent);
      expect( ondrop ).toHaveBeenCalledTimes(1);
      expect( ondrop.mock.lastCall?.[0] ).toBeInstanceOf( Event );
      expect( ondrop.mock.lastCall?.[1] ).toStrictEqual( asset );
    });

    test('ondragover and ondrop are called on children', async () => {
      const ondragover = jest.fn();
      const ondrop = jest.fn();
      const wrapper = mount(AssetTree, {
        props: { asset, ondragover, ondrop, expand: true },
      });
      await wrapper.get('[data-path="RootNode/ChildNode"]').trigger('dragover', dragEvent);
      expect( ondragover ).toHaveBeenCalledTimes(1);
      expect( ondragover.mock.lastCall?.[0] ).toBeInstanceOf( Event );
      expect( ondragover.mock.lastCall?.[1] ).toStrictEqual( asset.children?.[0] );

      await wrapper.get('[data-path="RootNode/ChildNode"]').trigger('drop', dragEvent);
      expect( ondrop ).toHaveBeenCalledTimes(1);
      expect( ondrop.mock.lastCall?.[0] ).toBeInstanceOf( Event );
      expect( ondrop.mock.lastCall?.[1] ).toStrictEqual( asset.children?.[0] );
    });

  });
});

