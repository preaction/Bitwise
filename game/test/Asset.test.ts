
import {describe, test, expect, beforeEach} from '@jest/globals';
import Load from '../src/Load.js';
import Asset, {AssetProps} from '../src/Asset.js';

class MockAsset extends Asset {}
const mockAssetCons = MockAsset;

describe('Asset', () => {
  test('requires a Load object', () => {
    // @ts-ignore
    expect( () => new Asset(null, "") ).toThrow();
  } );

  describe('register()', () => {
    beforeEach( () => {
      Asset.classes = {};
    } );

    test( 'register uses constructor name', () => {
      Asset.register( MockAsset );
      expect( Asset.classes ).toHaveProperty( MockAsset.name );
      expect( Asset.classes[MockAsset.name] ).toBe( MockAsset );
    });
    test( 'cannot register different classes with same name', () => {
      class MockAsset extends Asset {
        constructor( load:Load, opt:AssetProps ) {
          super(load, opt);
        }
      };
      expect( () => Asset.register(mockAssetCons) ).not.toThrow();
      expect( () => Asset.register( MockAsset ) ).toThrow(/already registered/);
      expect( () => Asset.register(mockAssetCons) ).not.toThrow();
    });
  });

  describe( 'ref()/deref()', () => {
    let load:Load;
    beforeEach( () => {
      load = new Load();
      Asset.classes = {};
      Asset.register( MockAsset );
    });

    test('ref()', () => {
      const path = "path/to/asset";
      const asset = new MockAsset(load, { path });
      const ref = asset.ref();
      expect( ref.$asset ).toBe( MockAsset.name );
      expect( ref.path ).toBe( path );
    } );

    test('deref()', async () => {
      const path = "path/to/asset";
      const ref = {
        $asset: MockAsset.name,
        path,
      };
      const asset = await Asset.deref( load, ref );
      expect( asset ).toBeInstanceOf(MockAsset)
      expect( asset.path ).toBe( path );
    } );

    test('roundtrip', async () => {
      const asset = new MockAsset(load, { path: "" });
      const ref = asset.ref();
      expect( await Asset.deref( load, ref ) ).toEqual( asset );
    });
  });
});
