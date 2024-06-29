
import { describe, test, expect, jest } from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import MockBackend from '../../../mock/backend.js';
import Project from '../../../../src/model/Project.js';
import GameConfig from '../../../../src/components/GameConfig.vue';

const backend = new MockBackend();
const project = new Project(backend, "ProjectName");
const provide = { project: ref(project) };

describe('GameConfig', () => {
  test('load config from file', async () => {
    const configData = {
      game: {
        renderer: {
          width: 1280,
          height: 720,
        },
      },
    };
    const mockRead = jest.spyOn(backend, 'readItemData').mockResolvedValue(JSON.stringify(configData));
    const wrapper = mount(GameConfig, { global: { provide } });
    await flushPromises();
    expect(mockRead).toHaveBeenCalledWith(project.name, 'bitwise.json');
    expect(wrapper.vm.$el.querySelector('#width').value).toBe("" + configData.game.renderer.width);
    expect(wrapper.vm.$el.querySelector('#height').value).toBe("" + configData.game.renderer.height);
  });

  test('write config to file', async () => {
    const mockWrite = jest.spyOn(backend, 'writeItemData').mockResolvedValue();
    const wrapper = mount(GameConfig, { global: { provide } });
    await flushPromises();

    const newWidth = 1600;
    const newHeight = 800;
    await wrapper.get('#width').setValue(newWidth);
    await wrapper.get('#height').setValue(newHeight);
    expect(wrapper.get('[data-test=save]').attributes('disabled')).toBeFalsy();

    await wrapper.get('form').trigger('submit');
    expect(mockWrite).toHaveBeenCalled();
    expect(mockWrite.mock.lastCall?.[0]).toBe(project.name);
    expect(mockWrite.mock.lastCall?.[1]).toBe('bitwise.json');
    const configData = JSON.parse(mockWrite.mock.lastCall?.[2] || '{}')
    expect(configData?.game?.renderer?.width).toBe(newWidth);
    expect(configData?.game?.renderer?.height).toBe(newHeight);
  });
});
