
import {describe, test, expect, beforeEach, jest} from '@jest/globals';
import 'global-jsdom/register';
import Asset from '../src/Asset.js';
import Atlas from '../src/Atlas.js';
import Load from '../src/Load.js';
import Texture from '../src/Texture.js';

describe('Texture', () => {
  test( 'registers itself', () => {
    expect( Asset.classes[ Texture.name ] ).toBe( Texture );
  } );

  describe( 'ref()/deref()', () => {
    let load:Load;
    beforeEach( () => {
      load = new Load();
      // @ts-ignore
      Texture.loadedTexturePaths = {};
      // @ts-ignore
      Texture.loadedTextures = [];
    });

    test('roundtrip', async () => {
      const asset = new Texture(load, { path: "image.png" });
      const ref = asset.ref();
      expect( await Asset.deref( load, ref ) ).toEqual( asset );
    });

    describe('Texture from Atlas', () => {
      test('ref()', () => {
        const atlas = new Atlas(load, "atlas.xml");
        const texture = new Texture(load, "atlas.xml/texture_01.png");
        texture.atlas = atlas;
        const ref = texture.ref();
        expect( ref.$asset ).toBe( Texture.name );
        expect( ref.path ).toBe( texture.path );
        expect( ref.atlas ).toBe( atlas.path );
      });

      test('deref()', async () => {
        const imagePath = "image.png";
        const atlasXml = `<TextureAtlas imagePath="${imagePath}">
          <SubTexture name="texture_01.png" x="0" y="0" width="10" height="10"/>
          <SubTexture name="texture_02.png" x="20" y="20" width="10" height="10"/>
        </TextureAtlas>`;
        const mockLoadText = jest.spyOn( load, "text" );
        mockLoadText.mockResolvedValue( atlasXml );

        const ref = {
          $asset: Texture.name,
          path: "atlas.xml/texture_01.png",
          atlas: "atlas.xml",
        };
        const texture = await Asset.deref(load, ref) as Texture;
        expect( texture ).toBeInstanceOf(Texture)
        expect( texture.atlas ).toBeInstanceOf( Atlas );
        expect( texture.atlas?.path ).toBe( ref.atlas );
        expect( texture.src ).toBe( imagePath );
      });
    });
  });
});
