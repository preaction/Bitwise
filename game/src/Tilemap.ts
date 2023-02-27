
import * as three from 'three';
import Tileset from './Tileset.js';

/**
 */
export class Tile extends three.Mesh {
  tileset: Tileset;
  tileIndex: number;
  constructor( vec:three.Vector2, tileset:Tileset, tileIndex:number ) {
    const geometry = new three.PlaneGeometry(tileset.tileWidth, tileset.tileHeight);
    // XXX: Should setting tileIndex update texture?
    const texture = tileset.tiles[tileIndex]._texture;
    const material = new three.MeshBasicMaterial({ map: texture });
    super( geometry, material );
    this.position.x = vec.x;
    this.position.y = vec.y;
    this.tileset = tileset;
    this.tileIndex = tileIndex;
  }
}

export class Tilemap extends three.Object3D {
  tileset:{ [key:string]:Tileset } = {};
  tileWidth:number = 0;
  tileHeight:number = 0;
  tiles:Tile[][] = [];

  // XXX: This will be for optimization later.
  //_planes:three.Mesh[][];

  constructor() {
    super();
  }

  addTileset( key:string, tileset:Tileset ):Tileset {
    this.tileset[key] = tileset;
    return tileset;
  }

  setTile( coords:three.Vector2, tilesetKey:string, tileIndex:number ):Tile {
    const tileset = this.tileset[tilesetKey];
    if ( !this.tiles[coords.x] ) {
      this.tiles[coords.x] = [];
    }

    if ( this.tiles[coords.x][coords.y] ) {
      throw "Cannot replace tile (yet)";
    }

    const tile = new Tile(coords, tileset, tileIndex);
    this.tiles[coords.x][coords.y] = tile;
    this.add(tile);
    return tile;
  }

  // Tilemap builds planes by rendering sprites to a texture
  renderPlane( coords:three.Vector4 ) {
    const planeWidth = this.tileWidth * coords.width,
          planeHeight = this.tileHeight * coords.height;

    // Create a target to render to
    const scene = new three.Scene();
    const target = new three.WebGLRenderTarget( planeWidth, planeHeight );

    // For each tile...
      // Create a sprite with the correct texture
      // Add it to the scene at the correct location

    // Render the texture once
    // Create a PlaneGeometry referencing the target.texture
  }
}
