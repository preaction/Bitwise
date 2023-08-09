
import {describe, test, expect, jest} from '@jest/globals';
import 'global-jsdom/register';
import Atlas from '../src/Atlas.js';
import Load from '../src/Load.js';
import Texture from '../src/Texture.js';

describe('Load', () => {
  describe( 'asset()', () => {
    test('loads a texture asset from an image path', async () => {
      const texturePath = 'path/to/image.png';
      const load = new Load();
      const tex = await load.asset(texturePath);
      expect( tex ).toBeInstanceOf( Texture );
      expect( tex.path ).toBe( texturePath );
    });

    test('loads a texture asset from a data URL', async () => {
      const textureData = 'data:image/png;base64,0xdeadbeef';
      const load = new Load();
      const tex = await load.asset(textureData);
      expect( tex ).toBeInstanceOf( Texture );
      expect( tex.path ).toBe( textureData );
    });

    test('uses the same ID for the same texture path', async () => {
      const texturePath = 'path/to/image.png';
      const load = new Load();
      const tex1 = await load.asset(texturePath) as Texture;
      const tex2 = await load.asset(texturePath) as Texture;
      expect( tex1.textureId ).toBe( tex2.textureId );
    });

    test('loads an atlas from XML', async () => {
      const atlasPath = 'path/to/atlas.xml';
      const atlasData =
        `<TextureAtlas imagePath="sprite.png">
          <SubTexture name="texture_01.png" x="0" y="0" width="10" height="10"/>
          <SubTexture name="texture_02.png" x="20" y="20" width="10" height="10"/>
        </TextureAtlas>`;
      const load = new Load();
      const mockText = jest.spyOn(load, "text").mockResolvedValueOnce(atlasData);

      const atlas = await load.asset( atlasPath );
      expect( atlas ).toBeInstanceOf(Atlas);
      expect( atlas.path ).toBe( atlasPath );
      expect( atlas.children ).toHaveLength( 2 );
      expect( atlas.children?.[0] ).toBeInstanceOf( Texture );
      expect( atlas.children?.[0]?.path ).toBe( `${atlasPath}/texture_01.png` );
      expect( atlas.children?.[1] ).toBeInstanceOf( Texture );
      expect( atlas.children?.[1]?.path ).toBe( `${atlasPath}/texture_02.png` );

      mockText.mockRestore();
    });
  });
});
