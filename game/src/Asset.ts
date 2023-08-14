
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
  static classes:{ [key:string]: typeof Asset } = {};
  static register( cls:typeof Asset ) {
    if ( Asset.classes[ cls.name ] && Asset.classes[ cls.name ] != cls ) {
      throw `Another Asset named ${cls.name} already registered!`;
    }
    Asset.classes[cls.name] = cls;
  }
  static async deref( load:Load, ref:AssetRef ):Promise<Asset> {
    const cons = Asset.classes[ ref.$asset ];
    if ( !cons ) {
      throw `Unknown asset type "${ref.$asset}"`;
    }
    if ( this !== Asset ) {
      return new cons( load, ref );
    }
    return cons.deref( load, ref );
  }

  /**
   * The loader that loaded this asset.
   */
  load:Load;

  /**
   * The location of this asset. A URI.
   */
  path:string;

  /**
   * The children of this asset. All assets can contain other assets.
   */
  children?:Asset[];

  constructor( load:Load, props:AssetProps="" ) {
    if ( !load ) {
      throw new Error("Asset: Load object must be given to constructor");
    }
    this.load = load;
    if ( typeof props === 'string' ) {
      this.path = props;
    }
    else {
      this.path = props.path ?? "";
    }
  }

  ref():AssetRef {
    return {
      $asset: this.constructor.name,
      path: this.path,
    };
  }
}
