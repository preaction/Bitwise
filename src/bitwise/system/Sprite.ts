
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from '../Scene.ts';

export default class Sprite {
  scene:Scene;
  sprites:three.Sprite[] = [];
  materials:three.SpriteMaterial[] = [];
  component:any;
  position:any;

  constructor( scene:Scene ) {
    this.scene = scene;

    this.position = scene.components[ "Position" ];
    this.component = scene.components[ "Sprite" ];

    this.query = bitecs.defineQuery([ this.position.store, this.component.store ]);
    this.enterQuery = bitecs.enterQuery( this.query );
    this.exitQuery = bitecs.exitQuery( this.query );
  }

  update( timeMilli:Number ) {
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

  add( eid:Number ) {
    // Find the sprite's texture
    const tid = this.component.store.textureId[eid];
    const texture = this.scene.game.textures[tid];
    const material = this.materials[eid] = new three.SpriteMaterial( { map: texture } );
    const sprite = this.sprites[eid] = new three.Sprite( material );
    sprite.position.x = this.position.store.x[eid];
    sprite.position.y = this.position.store.y[eid];
    sprite.position.z = this.position.store.z[eid];
    sprite.scale.x = this.position.store.sx[eid];
    sprite.scale.y = this.position.store.sy[eid];
    sprite.scale.z = this.position.store.sz[eid];
    // XXX: If entity has a Parent, add it to that instead
    this.scene._scene.add( sprite );
  }

  remove( eid:Number ) {
    this.scene._scene.remove( this.sprites[eid] );
    this.sprites[eid] = null;
  }
}
