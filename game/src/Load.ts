
import * as three from 'three';
import Asset from './Asset.js';
import Texture from './Texture.js';
import Atlas from './Atlas.js';

const DEFAULT_TEXTURE = "data:image/webp;base64,UklGRkAAAABXRUJQVlA4TDMAAAAv/8A/AA/wEP5zxv9cf/6DB2TSNvNvuleZgrGI/pNN2pAH0nbrCYiIvffoe+y9x/3/HQAA";

/**
 * The Load class handles loading files and registering asset paths for
 * {@link Component} classes to use. Since components work only with
 * numbers, this class maps paths to numeric IDs that can be looked up
 * by {@link System} objects when needed.
 */
export default class Load extends three.EventDispatcher {
  /**
   * The base URL to prefix to any URL that does not contain a scheme
   * (like `http:`).
   */
  base:string;

  constructor( opt:{base?:string}={} ) {
    super();
    this.base = opt.base || '';
    Texture.defaultTexture = new Texture( this, DEFAULT_TEXTURE );
  }

  /**
   * Loads the Asset at the given path. Creates an Asset object (or one
   * of its subclasses) based on the path or (if necessary) contents of
   * the file.
   */
  async asset( path:string ):Promise<Asset> {
    if ( path.match( /\.(?:png|jpe?g|gif)$/ ) || path.match( /^data:image/ ) ) {
      return new Texture( this, path );
    }
    else if ( path.match( /\.xml$/ ) ) {
      const xml = await this.text( path );
      const dom = new DOMParser().parseFromString(xml, "application/xml");
      if ( dom.documentElement.tagName.toLowerCase() === "textureatlas" ) {
        return new Atlas( this, path ).parseDOM(dom);
      }
    }
    return new Asset( this, path );
  }

  /**
   * Load the text file at the given path. Returns a Promise that
   * resolves to the text and rejects on any error.
   */
  async text( path:string ):Promise<string> {
    return fetch(this.base + path).then( res => res.text() );
  }

  /**
   * Load the JSON file at the given path. Returns a Promise that
   * resolves to the parsed JSON and rejects on any error.
   */
  async json( path:string ):Promise<any> {
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
    const texture = new Texture( this, path );
    return texture.textureId;
  }
}
