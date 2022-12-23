/**
 * The Load class handles registering asset paths for components to use.
 * Since components work only with numbers, this class maps paths to
 * numeric IDs that can be looked up by systems when needed.
 */

import * as three from 'three';

const DEFAULT_TEXTURE = "data:image/webp;base64,UklGRkAAAABXRUJQVlA4TDMAAAAv/8A/AA/wEP5zxv9cf/6DB2TSNvNvuleZgrGI/pNN2pAH0nbrCYiIvffoe+y9x/3/HQAA";

export default class Load extends three.EventDispatcher {
  /**
   * The base URL to prefix to any URL that does not contain a scheme
   * (like `http:`).
   */
  base:string;

  /**
   * A map of texture paths to ID numbers.
   */
  textureIds:{ [key:string]: number } = {};
  /**
   * A map of texture ID numbers to paths
   */
  texturePaths:string[] = [];

  constructor( opt:{base:string} ) {
    super();
    this.base = opt.base || '';

    // Load default texture as texture ID 0
    this.texture( DEFAULT_TEXTURE );
  }

  /**
   * Load the JSON file at the given path. Returns a Promise that
   * resolves to the parsed JSON and rejects on any error.
   */
  json( path:string ):Promise<any> {
    return fetch(this.base + path).then( res => res.json() );
  }

  /**
   * Register the texture with the given path. Returns the texture's ID
   * number to be used in components.
   *
   * This does not download or load the texture into memory. Textures
   * must be loaded by the renderer when needed.
   */
  texture( path:string ):number {
    let textureId = this.texturePaths.indexOf( path );
    if ( textureId < 0 ) {
      this.texturePaths.push( path );
      textureId = this.texturePaths.length - 1;
      this.textureIds[ path ] = textureId;
    }
    return textureId;
  }
}
