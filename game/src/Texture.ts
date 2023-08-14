import Asset, {AssetProps, AssetRef} from "./Asset";
import Atlas from "./Atlas";
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

  /**
   * The Atlas containing this Texture, if any.
   */
  atlas:Atlas|null = null;

  static async deref( load:Load, props:AssetProps ):Promise<Texture> {
    // If we're loading a texture from an atlas, load the atlas first.
    // This will incidentally create Textures for everything in the
    // Atlas, which we will then copy.
    if ( typeof props !== 'string' && props.atlas ) {
      await load.asset( props.atlas );
    }
    return new Texture( load, props );
  }

  constructor( load:Load, props:AssetProps ) {
    super(load, props);
    this.src = ( this.path.match(/^[a-z]+:/) ? '' : load.base ) + this.path;
    this.textureId = Texture.loadedTextures.length;

    if ( this.path && Texture.loadedTexturePaths[this.path] ) {
      Object.assign( this, Texture.loadedTexturePaths[this.path] );
    }
    else {
      Texture.loadedTexturePaths[this.path] = this;
      Texture.loadedTextures.push( this );
    }
  }

  static defaultTexture:Texture;
  private static loadedTextures:Texture[] = [];
  private static loadedTexturePaths:{[key:string]: Texture} = {};
  static getById( id:number ):Texture {
    return Texture.loadedTextures[id] || Texture.defaultTexture;
  }

  ref():AssetRef {
    const ref = super.ref();
    if ( this.atlas ) {
      ref.atlas = this.atlas.path;
    }
    return ref;
  }
}

Asset.register( Texture );
