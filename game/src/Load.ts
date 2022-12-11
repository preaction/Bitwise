
import * as three from 'three';

const DEFAULT_TEXTURE = "data:image/webp;base64,UklGRkAAAABXRUJQVlA4TDMAAAAv/8A/AA/wEP5zxv9cf/6DB2TSNvNvuleZgrGI/pNN2pAH0nbrCYiIvffoe+y9x/3/HQAA";

export default class Load extends three.EventDispatcher {
  base:string;

  textureIds:{ [key:string]: number } = {};
  texturePaths:string[] = [];

  constructor( opt:{base:string} ) {
    super();
    this.base = opt.base || '';

    // Set up loaders
    three.Cache.enabled = true;
    three.DefaultLoadingManager.setURLModifier(
      url => {
        // Let full URLs pass through unharmed
        if ( url.match( /^[a-zA-Z]+:/ ) ) {
          return url;
        }
        return this.base + url
      },
    );

    // Load default texture as texture ID 0
    this.texture( DEFAULT_TEXTURE );
  }

  async json( path:string ):Promise<any> {
    const res = await fetch(this.base + path);
    return res.json();
  }

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
