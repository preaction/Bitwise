
import Load from './Load.js';

export type AssetProps = string | {
  path: string,
  [key: string]: any,
};
export type AssetRef = {
  $asset: string,
  path: string,
  [key: string]: any,
};

/**
 * Asset is the base class of a single game resource. Assets may be
 * actual (files and folders) or virtual (slices of an image).
 */
export default class Asset {
  static refType: string = 'Asset';
  static classes: { [key: string]: typeof Asset } = {};
  static register(cls: typeof Asset) {
    if (Asset.classes[cls.refType] && Asset.classes[cls.refType] != cls) {
      throw `Another Asset named ${cls.refType} already registered!`;
    }
    Asset.classes[cls.refType] = cls;
  }
  static async deref(load: Load, ref: AssetRef): Promise<Asset> {
    const cons = Asset.classes[ref.$asset];
    if (!cons) {
      throw `Unknown asset type "${ref.$asset}". Known types: ${Object.keys(Asset.classes).join(' ')}`;
    }
    if (this !== Asset) {
      return new cons(load, ref);
    }
    return cons.deref(load, ref);
  }

  /**
   * The loader that loaded this asset.
   */
  load: Load;

  /**
   * The location of this asset. A URI.
   */
  path: string;

  /**
   * The children of this asset. All assets can contain other assets.
   */
  children?: Asset[];

  /**
   * Arbitrary data for this asset.
   */
  data: any;

  constructor(load: Load, props: AssetProps = "") {
    if (!load) {
      throw new Error("Asset: Load object must be given to constructor");
    }
    this.load = load;
    if (typeof props === 'string') {
      this.path = props;
    }
    else {
      this.path = props.path ?? "";
    }
  }

  get name(): string {
    return this.path.slice(this.path.lastIndexOf('/') + 1);
  }

  ref(): AssetRef {
    return {
      $asset: (this.constructor as typeof Asset).refType,
      path: this.path,
    };
  }
}
