
import {describe, test, expect, beforeEach, jest} from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import MockBackend from '../../../mock/backend.js';
import Project from '../../../../src/model/Project.js';
import ImageView from '../../../../src/components/ImageView.vue';
import { Load, Texture } from '@fourstar/bitwise';
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
    const asset = new Texture(new Load(), "image.png");
    const tab = new Tab( project, asset );
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
    const asset = new Texture(new Load(), "atlas.xml/texture_01.png");
    asset.src = "image.png";
    asset.x = 10;
    asset.y = 10;
    asset.width = 100;
    asset.height = 100;
    const tab = new Tab( project, asset );
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
