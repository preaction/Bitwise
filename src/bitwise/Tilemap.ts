
import * as three from 'three';
import * as bitwise from '../Bitwise.ts';

export class Tile extends three.Mesh {
  tileset: bitwise.Tileset;
  tileIndex: Number;
  constructor( vec:three.Vector2, tileset:bitwise.Tileset, tileIndex:Number ) {
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
  tileset:{ [key:string]:bitwise.Tileset } = {};
  tileWidth:Number;
  tileHeight:Number;
  tiles:Tile[][] = [];

  // XXX: This will be for optimization later.
  _planes:three.Mesh[][];

  constructor() {
    super();
  }

  addTileset( key:string, tileset:bitwise.Tileset ):bitwise.Tileset {
    this.tileset[key] = tileset;
    return tileset;
  }

  setTile( coords:three.Vector2, tilesetKey:string, tileIndex:Number ):Tile {
    const tileset = this.tileset[tilesetKey];
    if ( !this.tiles[coords.x] ) {
      this.tiles[coords.x] = [];
    }

    if ( this.tiles[coords.x][coords.y] ) {
      throw "Cannot replace tile (yet)";
    }

    const pos = new three.Vector3( coords.x, coords.y, 0 );
    const tile = new Tile(pos, tileset, tileIndex);
    this.tiles[coords.x][coords.y] = tile;
    this.add(tile);
    return tile;
  }

  // Tilemap builds planes by rendering sprites to a texture
  renderPlane( coords:three.Vector4 ) {
    const planeWidth = this.tileWidth * coords.width,
          planeHeight = this.tileHeight * coords.height;

    // Create a target to render to
    const scene = three.Scene();
    const target = three.WebGLRenderTarget( planeWidth, planeHeight );

    // For each tile...
      // Create a sprite with the correct texture
      // Add it to the scene at the correct location

    // Render the texture once
    // Create a PlaneGeometry referencing the target.texture
  }
}
