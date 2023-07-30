
import {describe, test, expect, beforeEach, jest} from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import MockBackend from '../../../mock/backend.js';
import Project from '../../../../src/model/Project.js';
import ImageView from '../../../../src/components/ImageView.vue';
import Texture from '../../../../src/model/projectitem/Texture.js';
import Tab from '../../../../src/model/Tab.js';
import type Backend from '../../../../src/Backend.js';

let backend:Backend, project:Project, provide:{[key:string]:any}, baseUrl:string;

beforeEach( () => {
  backend = new MockBackend();
  project = new Project(backend, "ProjectName");
  baseUrl = `https://example.game/${project.name}`;
  provide = { backend, project, baseUrl };
} );

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

  test( 'shows an image from an atlas', async () => {
    const projectItem = new Texture(project, "atlas.xml/texture_01.png");
    projectItem.src = "image.png";
    projectItem.x = 10;
    projectItem.y = 10;
    projectItem.width = 100;
    projectItem.height = 100;
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
    expect( img.attributes('style') ).toMatch( /M\s+10\s+10\s+h\s+100\s+v\s+100\s+h\s+-100\s+Z/ );
  });
});
