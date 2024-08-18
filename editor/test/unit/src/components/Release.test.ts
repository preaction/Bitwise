
import { describe, test, expect, jest } from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import MockBackend from '../../../mock/backend.js';
import Project from '../../../../src/model/Project.js';
import Release from '../../../../src/components/Release.vue';
import InputAsset from '../../../../src/components/InputAsset.vue';

const backend = new MockBackend();
const project = new Project(backend, "ProjectName");
const provide = { backend, project };
const components = {
  InputAsset,
};

describe('Release', () => {
  describe('Itch.io web game (zip)', () => {
    test('shows Itch.io web game form (zip)', async () => {
      const mockReadItemData = jest.spyOn(backend, 'readItemData');
      mockReadItemData.mockResolvedValue("{}")
      const tab = {
        name: "Release",
        component: "Release",
        icon: 'fa-file-export',
        src: 'bitwise.json',
        ext: 'json',
        edited: false,
      };
      const wrapper = mount(Release, {
        props: {
          modelValue: tab,
        },
        global: { provide, components },
      });
      await flushPromises();

      expect(mockReadItemData).toHaveBeenCalledWith(project.name, 'bitwise.json');
      expect(wrapper.find('#release-zip button')).toBeTruthy();
      const sceneInput = wrapper.getComponent(InputAsset);
      expect(sceneInput.props('modelValue')).toBeFalsy();
    });

    test('releases Itch.io web game (zip)', async () => {
      const mockReadItemData = jest.spyOn(backend, 'readItemData');
      mockReadItemData.mockResolvedValue("{}")
      const mockWriteItemData = jest.spyOn(backend, 'writeItemData');
      mockWriteItemData.mockResolvedValue();
      const mockReleaseProject = jest.spyOn(backend, 'releaseProject');
      mockReleaseProject.mockResolvedValue()

      const tab = {
        name: "Release",
        component: "Release",
        icon: 'fa-file-export',
        src: 'bitwise.json',
        ext: 'json',
        edited: false,
      };
      const wrapper = mount(Release, {
        props: {
          modelValue: tab,
        },
        global: { provide, components },
      });
      await flushPromises();

      // Select a scene
      const sceneName = 'Loader.json';
      const sceneInput = wrapper.getComponent(InputAsset);
      sceneInput.vm.$emit('update:modelValue', sceneName);

      // Push the button
      const configJson = JSON.stringify({ release: { zip: { scene: sceneName } } }, null, 2);
      await wrapper.get('#release-zip button').trigger('click');
      expect(mockWriteItemData).toHaveBeenCalledWith(project.name, 'bitwise.json', configJson);
      expect(mockReleaseProject).toHaveBeenCalledWith(project.name, 'zip');
    });

    test('restores last released settings (zip)', async () => {
      const mockReadItemData = jest.spyOn(backend, 'readItemData');
      mockReadItemData.mockResolvedValue(
        JSON.stringify({
          release: {
            zip: {
              scene: "Loader.json",
            },
          },
        })
      );
      const tab = {
        name: "Release",
        component: "Release",
        icon: 'fa-file-export',
        src: 'bitwise.json',
        ext: 'json',
        edited: false,
      };
      const wrapper = mount(Release, {
        props: {
          modelValue: tab,
        },
        global: { provide, components },
      });
      await flushPromises();

      expect(mockReadItemData).toHaveBeenCalledWith(project.name, 'bitwise.json');
      const sceneInput = wrapper.getComponent(InputAsset);
      expect(sceneInput.props('modelValue')).toBe('Loader.json');
    });
  });
});
