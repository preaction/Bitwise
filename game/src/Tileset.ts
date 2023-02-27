
import * as three from 'three';

/**
 */
type TileData = {
  x:number;
  y:number;
  passable?:boolean;
  /**
   * A clone of the Tileset texture with the appropriate offsets.
   */
  _texture:three.Texture;
}

type TilesetOptions = {
  src:string;
  tileWidth:number;
  tileHeight:number;
  tiles:TileData[];
}

export default class Tileset {
  src:string;
  readonly tileWidth:number;
  readonly tileHeight:number;
  tiles:TileData[] = [];

  /**
   * The main texture, before any transformations.
   */
  _texture:three.Texture|null = null;
  _loadPromise:Promise<three.Texture>|null = null;

  constructor( opts:TilesetOptions ) {
    if ( !opts.tileWidth ) {
      throw "tileWidth must be specified";
    }
    this.src = opts.src;
    this.tileWidth = opts.tileWidth;
    this.tileHeight = opts.tileHeight || opts.tileWidth;

    if ( this.src ) {
      this.load();
    }
  }

  get imageWidth():number {
    if ( !this._texture ) {
      return 0;
    }
    const img = this._texture.image;
    return img.naturalWidth || img.width;
  }

  get imageHeight():number {
    if ( !this._texture ) {
      return 0;
    }
    const img = this._texture.image;
    return img.naturalHeight || img.height;
  }

  load():Promise<three.Texture> {
    if ( this._loadPromise ) {
      return this._loadPromise;
    }
    const loader = new three.TextureLoader();
    return this._loadPromise = new Promise<three.Texture>(
      (resolve, reject) => {
        const after = ( t:three.Texture ) => {
          // Texture repeat should be the size of one tile.
          t.repeat.set( this.tileWidth / this.imageWidth, this.tileHeight / this.imageHeight );
          this._buildTiles();
          resolve(t);
        };
        this._texture = loader.load( this.src, after, undefined, reject );
      },
    );
  }

  _buildTiles() {
    if ( !this._texture ) {
      return;
    }
    for ( let py = 0; py < this.imageHeight; py += this.tileHeight ) {
      const y = py/this.tileHeight;
      const rowIdx = y*(this.imageWidth/this.tileWidth);
      for ( let px = 0; px < this.imageWidth; px += this.tileWidth ) {
        const x = px/this.tileWidth;
        const idx = rowIdx + x;
        // Clone _texture with the correct offsets for each tile.
        // _texture.repeat is already set to show one tile, so just
        // changing the offset changes which tile is shown on the
        // texture.
        const texture = this._texture.clone();
        texture.offset.set(px, py);
        this.tiles[idx] = { x, y, _texture: texture };
      }
    }
  }
}

