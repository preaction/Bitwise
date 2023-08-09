
import Load from './Load.js';

/**
 * Asset is the base class of a single game resource. Assets may be
 * actual (files and folders) or virtual (slices of an image).
 */
export default class Asset {
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

  constructor( load:Load, path:string ) {
    if ( !load ) {
      throw new Error("Asset: Load object must be given to constructor");
    }
    this.load = load;
    this.path = path;
  }

}
