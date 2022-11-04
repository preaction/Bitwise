
import * as three from 'three';
import * as bitecs from 'bitecs';
import System from '../System.js';
import Scene from '../Scene.js';
import Component from '../Component.js';
import Position from '../component/Position.js';
import SpriteComponent from '../component/Sprite.js';

export default class Sprite extends System {
  sprites:three.Sprite[] = [];
  materials:three.SpriteMaterial[] = [];
  component:SpriteComponent;
  position:Position;

  query:bitecs.Query;
  enterQuery:bitecs.Query;
  exitQuery:bitecs.Query;

  constructor( name:string, scene:Scene ) {
    super(name, scene);
    this.position = scene.getComponent(Position);
    this.component = scene.getComponent(SpriteComponent);

    this.query = scene.game.ecs.defineQuery([ this.position.store, this.component.store ]);
    this.enterQuery = scene.game.ecs.enterQuery( this.query );
    this.exitQuery = scene.game.ecs.exitQuery( this.query );
  }

  update( timeMilli:number ) {
    // enteredQuery for cameraQuery: Create Camera and add to Scene
    const add = this.enterQuery(this.scene.world);
    for ( const eid of add ) {
      this.add( eid ); 
    }

    // exitedQuery for cameraQuery: Remove Camera from Scene
    const remove = this.exitQuery(this.scene.world);
    for ( const eid of remove ) {
      this.remove(eid);
    }

    // cameraQuery: Update camera properties and render if needed
    const update = this.query(this.scene.world);
    for ( const eid of update ) {
      const sprite = this.sprites[eid];
      sprite.position.x = this.position.store.x[eid];
      sprite.position.y = this.position.store.y[eid];
      sprite.position.z = this.position.store.z[eid];
      sprite.scale.x = this.position.store.sx[eid];
      sprite.scale.y = this.position.store.sy[eid];
      sprite.scale.z = this.position.store.sz[eid];

      const tid = this.component.store.textureId[eid];
      const texture = this.scene.game.textures[tid];
      if ( this.materials[eid].map !== texture ) {
        const material = this.materials[eid] = new three.SpriteMaterial( { map: texture } );
        this.sprites[eid].material = material;
      }
    }
  }

  add( eid:number ) {
    // Find the sprite's texture
    const tid = this.component.store.textureId[eid];
    const texture = this.scene.game.textures[tid];
    const material = this.materials[eid] = new three.SpriteMaterial( { map: texture } );
    const sprite = this.sprites[eid] = new three.Sprite( material );
    sprite.layers.enable(1);
    sprite.position.x = this.position.store.x[eid];
    sprite.position.y = this.position.store.y[eid];
    sprite.position.z = this.position.store.z[eid];
    sprite.scale.x = this.position.store.sx[eid];
    sprite.scale.y = this.position.store.sy[eid];
    sprite.scale.z = this.position.store.sz[eid];
    // XXX: If entity has a parent, add it to that instead
    this.scene._scene.add( sprite );
  }

  remove( eid:number ) {
    this.scene._scene.remove( this.sprites[eid] );
    delete this.sprites[eid];
  }
}
