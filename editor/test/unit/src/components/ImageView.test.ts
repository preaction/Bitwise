
import {describe, test, expect} from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import MockBackend from '../../../mock/backend.js';
import Project from '../../../../src/model/Project.js';
import ImageView from '../../../../src/components/ImageView.vue';
import Texture from '../../../../src/model/projectitem/Texture.js';
import Tab from '../../../../src/model/Tab.js';

const backend = new MockBackend();
const project = new Project(backend, "ProjectName");
const baseUrl = `https://example.game/${project.name}`;
const provide = { backend, project, baseUrl };

describe( 'ImageView', () => {
  test( 'shows an image', async () => {
    const projectItem = new Texture(project, "image.png");
    const tab = new Tab( projectItem );
    const wrapper = mount( ImageView, {
      props: {
        modelValue: tab,
      },
      global: { provide },
    });
    await flushPromises();
    const img = wrapper.get('img');
    expect( img.attributes('src') ).toBe( `${baseUrl}/image.png` );
  });

  test.skip( 'shows an image from an atlas', async () => {
    // XXX: Mock project.getItem to get texture atlas
    const projectItem = new Texture(project, "atlas.xml#texture_01.png");
    const tab = new Tab( projectItem );
    const wrapper = mount( ImageView, {
      props: {
        modelValue: tab,
      },
      global: { provide },
    });
    await flushPromises();
    const img = wrapper.get('img');
    expect( img.attributes('src') ).toBe( `${baseUrl}/image.png` );
    // XXX: Check for crop at x/y/width/height
  });
});
