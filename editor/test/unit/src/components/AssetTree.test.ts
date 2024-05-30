
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { mount, flushPromises } from '@vue/test-utils';
import Backend from '../../../mock/backend';
import AssetTree from '../../../../src/components/AssetTree.vue';
import { Asset, Load } from '@fourstar/bitwise';
import type Project from '../../../../src/model/Project';

let mockBackend: Backend;
let project: Project;
let asset: Asset;
beforeEach(async () => {
  mockBackend = new Backend();
  project = await mockBackend.openProject('project');
  asset = new Asset(new Load(), { path: "RootNode" });
  asset.children = [
    new Asset(asset.load, { path: "RootNode/ChildNode" }),
  ];
  jest.replaceProperty(project, 'assets', [asset]);
});

describe('AssetTree', () => {
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

    test('dragging an asset uses asset ref', async () => {
      const wrapper = mount(AssetTree, {
        props: { project },
        global: {
          provide: { backend: mockBackend },
        },
      });
      await wrapper.get('[data-path=RootNode]').trigger('dragstart', dragEvent);
      expect(dragEvent.dataTransfer?.setData).toHaveBeenCalledWith("bitwise/asset", JSON.stringify(asset.ref()));
    });

  });
});

