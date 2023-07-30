
import {describe, expect, test} from '@jest/globals';
import MockBackend from '../../../../mock/backend.js';
import Project from '../../../../../src/model/Project.js';
import Atlas from '../../../../../src/model/projectitem/Atlas.js';

const project = new Project(new MockBackend(), "Project");

describe( 'Atlas', () => {
  test( 'should create textures from a DOM tree', () => {
    const xml = `<TextureAtlas imagePath="image.png">
      <SubTexture name="texture_01.png" x="0" y="0" width="10" height="10"/>
      <SubTexture name="texture_02.png" x="20" y="20" width="10" height="10"/>
    </TextureAtlas>`;
    const dom = new DOMParser().parseFromString(xml, "application/xml");

    const atlas = new Atlas(project, "path/to/atlas.xml");
    atlas.parseDOM(dom);

    expect( atlas.children ).toHaveLength(2);
    expect( atlas.children[0] ).toMatchObject({
      path: "path/to/atlas.xml/texture_01.png",
      src: "path/to/image.png",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });
    expect( atlas.children[1] ).toMatchObject({
      path: "path/to/atlas.xml/texture_02.png",
      src: "path/to/image.png",
      x: 20,
      y: 20,
      width: 10,
      height: 10,
    });
  });
});
