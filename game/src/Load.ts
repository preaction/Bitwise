
import * as three from 'three';

export default class Load extends three.EventDispatcher {
  base:string;

  textureIds:{ [key:string]: number } = {};
  texturePaths:string[] = [];

  constructor( opt:{base:string} ) {
    super();
    this.base = opt.base || '';

    // Set up loaders
    three.Cache.enabled = true;
    three.DefaultLoadingManager.setURLModifier( url => this.base + url );
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
