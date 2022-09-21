
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
      // XXX
    }

    // cameraQuery: Update camera properties and render if needed
    const update = this.query(this.scene.world);
    for ( const eid of update ) {
      // XXX
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
    // XXX: Figure out why the camera shows things very small unless
    // I do this.
    sprite.scale.multiplyScalar(16);
    // XXX: If entity has a Parent, add it to that instead
    this.scene._scene.add( sprite );
  }

  remove( eid:Number ) {
    this.scene._scene.remove( this.sprites[eid] );
    this.sprites[eid] = null;
  }
}
