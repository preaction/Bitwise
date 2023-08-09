import Asset from "./Asset";
import Load from "./Load";

export default class Texture extends Asset {
  /**
   * The ID number of this texture. Texture IDs can be used to get the
   * Texture object again.
   */
  textureId:number;

  /**
   * The source URI of the image containing this texture.
   */
  src:string;

  /**
   * The width of this Texture. If null, the rest of the Image should be
   * used.
   */
  width:number|null = null;

  /**
   * The height of this Texture. If null, the rest of the Image should be
   * used.
   */
  height:number|null = null;

  /**
   * The X-offset of this texture in its Image
   */
  x:number = 0;

  /**
   * The Y-offset of this texture in its Image
   */
  y:number = 0;

  constructor( load:Load, path:string ) {
    super(load, path);
    this.src = ( path.match(/^[a-z]+:/) ? '' : load.base ) + path;
    this.textureId = Texture.loadedTextures.length;

    if ( Texture.loadedTexturePaths[path] ) {
      Object.assign( this, Texture.loadedTexturePaths[path] );
    }
    else {
      Texture.loadedTexturePaths[path] = this;
      Texture.loadedTextures.push( this );
    }
  }

  static defaultTexture:Texture;
  private static loadedTextures:Texture[] = [];
  private static loadedTexturePaths:{[key:string]: Texture} = {};
  static getById( id:number ):Texture {
    return Texture.loadedTextures[id] || Texture.defaultTexture;
  }
}
