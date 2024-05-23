
import { describe, test, expect, beforeEach } from '@jest/globals';
import Load from '../src/Load.js';
import Asset, { AssetProps } from '../src/Asset.js';

class MockAsset extends Asset {
  static refType: string = 'MockAsset';
}
const mockAssetCons = MockAsset;

describe('Asset', () => {
  test('requires a Load object', () => {
    // @ts-ignore
    expect(() => new Asset(null, "")).toThrow();
  });

  describe('register()', () => {
    beforeEach(() => {
      Asset.classes = {};
    });

    test('register uses refType', () => {
      Asset.register(MockAsset);
      expect(Asset.classes).toHaveProperty(MockAsset.refType);
      expect(Asset.classes[MockAsset.refType]).toBe(MockAsset);
    });
    test('cannot register different classes with same refType', () => {
      class MockAsset extends Asset {
        static refType: string = 'MockAsset';
      };
      expect(() => Asset.register(mockAssetCons)).not.toThrow();
      expect(() => Asset.register(MockAsset)).toThrow(/already registered/);
      expect(() => Asset.register(mockAssetCons)).not.toThrow();
    });
  });

  describe('ref()/deref()', () => {
    let load: Load;
    beforeEach(() => {
      load = new Load();
      Asset.classes = {};
      Asset.register(MockAsset);
    });

    test('ref()', () => {
      const path = "path/to/asset";
      const asset = new MockAsset(load, { path });
      const ref = asset.ref();
      expect(ref.$asset).toBe(MockAsset.refType);
      expect(ref.path).toBe(path);
    });

    test('deref()', async () => {
      const path = "path/to/asset";
      const ref = {
        $asset: MockAsset.refType,
        path,
      };
      const asset = await Asset.deref(load, ref);
      expect(asset).toBeInstanceOf(MockAsset)
      expect(asset.path).toBe(path);
    });

    test('roundtrip', async () => {
      const asset = new MockAsset(load, { path: "" });
      const ref = asset.ref();
      expect(await Asset.deref(load, ref)).toEqual(asset);
    });
  });
});
