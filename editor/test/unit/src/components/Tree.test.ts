
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { mount, flushPromises } from '@vue/test-utils';
import Tree from '../../../../src/components/Tree.vue';
import { Asset, Load } from '@fourstar/bitwise';

let node: Asset;
beforeEach(() => {
  node = new Asset(new Load(), { path: "RootNode" });
  node.children = [
    new Asset(node.load, { path: "RootNode/ChildNode" }),
  ];
});

describe('Tree', () => {
  test('displays an asset', async () => {
    const wrapper = mount(Tree, {
      props: { node },
    });
    expect(wrapper.get('[data-test=name]').text()).toBe(node.path);
    expect(wrapper.find('.fa.fa-file')).toBeTruthy();
  });

  describe('display asset children', () => {
    test('expand prop displays children', async () => {
      const wrapper = mount(Tree, {
        props: { node, expand: true },
      });
      expect(wrapper.get('[data-test=name]').text()).toBe(node.path);
      expect(wrapper.find('.fa.fa-folder-open')).toBeTruthy();
      const child = wrapper.get('.children').getComponent(Tree);
      expect(child.get('[data-test=name]').text()).toBe(node.children?.[0].path.split('/').pop());
      expect(child.findAll('.fa')).toHaveLength(0);
    });
    test('expand prop does not allow click to close', async () => {
      const wrapper = mount(Tree, {
        props: { node, expand: true },
      });
      await wrapper.get('[data-test=name]').trigger('click');
      expect(wrapper.find('.fa.fa-folder-open')).toBeTruthy();
      const children = wrapper.find('.children');
      expect(children).toBeTruthy();
      expect(children.findAllComponents(Tree)).toHaveLength(1);
    });

    test('expand children by clicking expand button', async () => {
      const wrapper = mount(Tree, {
        props: { node },
      });
      await wrapper.get('[data-path="RootNode"] .show-children').trigger('click');
      expect(wrapper.find('.fa.fa-folder-open')).toBeTruthy();
      const children = wrapper.find('.children');
      expect(children).toBeTruthy();
      expect(children.findAllComponents(Tree)).toHaveLength(1);
    });

  });

  describe('onclick', () => {
    test('runs an onclick handler', async () => {
      const onclick = jest.fn();
      const wrapper = mount(Tree, {
        props: { node, onclick },
      });
      await wrapper.get('[data-path=RootNode]').trigger('click');
      expect(onclick).toHaveBeenCalledTimes(1);
      expect(onclick).toHaveBeenCalledWith(node);
    });

    test('runs an onclick handler when an ondblclick handler is present', async () => {
      const onclick = jest.fn();
      const ondblclick = jest.fn();
      const wrapper = mount(Tree, {
        props: { node, onclick, ondblclick },
      });
      await wrapper.get('[data-path=RootNode]').trigger('click');
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(onclick).toHaveBeenCalledTimes(1);
      expect(onclick).toHaveBeenCalledWith(node);
      expect(ondblclick).not.toHaveBeenCalled();
    });

    test('expanding children does not run onclick handler', async () => {
      const onclick = jest.fn();
      const wrapper = mount(Tree, {
        props: { node, onclick },
      });
      await wrapper.get('[data-path="RootNode"] .show-children').trigger('click');
      expect(onclick).not.toHaveBeenCalled();
    });

    test('runs an onclick handler in child node', async () => {
      const onclick = jest.fn();
      const wrapper = mount(Tree, {
        props: { node, onclick, expand: true },
      });
      await wrapper.get('[data-path="RootNode/ChildNode"]').trigger('click');
      expect(onclick).toHaveBeenCalledTimes(1);
      expect(onclick).toHaveBeenCalledWith(node.children?.[0]);
    });

  });

  describe('ondblclick', () => {
    test('runs an ondblclick handler', async () => {
      const ondblclick = jest.fn();
      const wrapper = mount(Tree, {
        props: { node, ondblclick },
      });
      await wrapper.get('[data-path=RootNode]').trigger('dblclick');
      expect(ondblclick).toHaveBeenCalledTimes(1);
      expect(ondblclick).toHaveBeenCalledWith(node);
    });

    test('runs an ondblclick handler when an onclick handler is present', async () => {
      const onclick = jest.fn();
      const ondblclick = jest.fn();
      const wrapper = mount(Tree, {
        props: { node, onclick, ondblclick },
      });
      await wrapper.get('[data-path=RootNode]').trigger('click');
      await wrapper.get('[data-path=RootNode]').trigger('dblclick');
      expect(ondblclick).toHaveBeenCalledTimes(1);
      expect(ondblclick).toHaveBeenCalledWith(node);
      expect(onclick).not.toHaveBeenCalled();
    });

    test('runs an ondblclick handler in child node', async () => {
      const ondblclick = jest.fn();
      const wrapper = mount(Tree, {
        props: { node, ondblclick, expand: true },
      });
      await wrapper.get('[data-path="RootNode/ChildNode"]').trigger('dblclick');
      expect(ondblclick).toHaveBeenCalledTimes(1);
      expect(ondblclick).toHaveBeenCalledWith(node.children?.[0]);
    });
  });

  describe('drag/drop', () => {
    let dragEvent: DragEvent;
    beforeEach(() => {
      dragEvent = {
        type: "dragover",
        preventDefault: jest.fn(),
        dataTransfer: {
          dropEffect: "none",
          setData: jest.fn(),
        } as unknown as DataTransfer,
      } as unknown as DragEvent;
    });

    test('dragover calls ondragover handler', async () => {
      const ondragover = jest.fn();
      const ondrop = jest.fn();
      const wrapper = mount(Tree, {
        props: { node, ondragover, ondrop },
      });
      await wrapper.get('[data-path=RootNode]').trigger('dragover', dragEvent);
      expect(ondragover).toHaveBeenCalledTimes(1);
      expect(ondragover.mock.lastCall?.[0]).toBeInstanceOf(Event);
      expect(ondragover.mock.lastCall?.[1]).toStrictEqual(node);
    });

    test('dropping calls ondrop handler', async () => {
      const ondrop = jest.fn();
      const wrapper = mount(Tree, {
        props: { node, ondrop },
      });
      await wrapper.get('[data-path=RootNode]').trigger('drop', dragEvent);
      expect(ondrop).toHaveBeenCalledTimes(1);
      expect(ondrop.mock.lastCall?.[0]).toBeInstanceOf(Event);
      expect(ondrop.mock.lastCall?.[1]).toStrictEqual(node);
    });

    test('ondragover and ondrop are called on children', async () => {
      const ondragover = jest.fn();
      const ondrop = jest.fn();
      const wrapper = mount(Tree, {
        props: { node, ondragover, ondrop, expand: true },
      });
      await wrapper.get('[data-path="RootNode/ChildNode"]').trigger('dragover', dragEvent);
      expect(ondragover).toHaveBeenCalledTimes(1);
      expect(ondragover.mock.lastCall?.[0]).toBeInstanceOf(Event);
      expect(ondragover.mock.lastCall?.[1]).toStrictEqual(node.children?.[0]);

      await wrapper.get('[data-path="RootNode/ChildNode"]').trigger('drop', dragEvent);
      expect(ondrop).toHaveBeenCalledTimes(1);
      expect(ondrop.mock.lastCall?.[0]).toBeInstanceOf(Event);
      expect(ondrop.mock.lastCall?.[1]).toStrictEqual(node.children?.[0]);
    });

  });
});

