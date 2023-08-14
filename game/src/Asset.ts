
import Load from './Load.js';

export type AssetProps = {
  path: string,
  [key: string]: any,
};
export type AssetRef = {
  $asset: string,
  path: string,
  [key: string]: any,
};
type AssetConstructor<T extends Asset> = new ( load:Load, props:AssetProps ) => T;

/**
 * Asset is the base class of a single game resource. Assets may be
 * actual (files and folders) or virtual (slices of an image).
 */
export default class Asset {
  static classes:{ [key:string]: AssetConstructor<any> } = {};
  static register<T extends Asset>( cls:AssetConstructor<T> ) {
    if ( Asset.classes[ cls.name ] && Asset.classes[ cls.name ] != cls ) {
      throw `Another Asset named ${cls.name} already registered!`;
    }
    Asset.classes[cls.name] = cls;
  }
  static deref<T extends Asset>( load:Load, ref:AssetRef ):T {
    const cons = Asset.classes[ ref.$asset ];
    if ( !cons ) {
      throw `Unknown asset type "${ref.$asset}"`;
    }
    return new cons( load, ref );
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

  constructor( load:Load, props:string|AssetProps="" ) {
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
