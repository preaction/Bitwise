
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from './Scene.ts';

export default class Sprite {
  scene:Scene;
  sprites:three.Sprite[] = [];
  materials:three.SpriteMaterial[] = [];
  component:any;
  position:any;

  constructor( scene:Scene ) {
    this.scene = scene;
    this.component = bitecs.defineComponent( this.componentData );
    this.position = scene.systems.Position;
    this.query = bitecs.defineQuery([ this.position.component, this.component ]);
    this.enterQuery = bitecs.enterQuery( this.query );
    this.exitQuery = bitecs.exitQuery( this.query );
  }

  get world() {
    return this.scene.world;
  }

  get componentData() {
    return {
      texture: bitecs.Types.ui8,
    }
  }

  update( timeMilli:Number ) {
    // enteredQuery for cameraQuery: Create Camera and add to Scene
    const add = this.enterQuery(this.world);
    for ( const eid of add ) {
      this.add( eid ); 
    }

    // cameraQuery: Update camera properties if needed
    const update = this.query(this.world);
    for ( const eid of update ) {
      // XXX
    }

    // exitedQuery for cameraQuery: Remove Camera from Scene
    const remove = this.exitQuery(this.world);
    for ( const eid of remove ) {
      // XXX
    }
  }

  add( eid:Number ) {
    // Find the sprite's texture
    const tid = this.component.texture[eid];
    const texture = this.scene.game.textures[tid];
    const material = this.materials[eid] = new three.SpriteMaterial( { map: texture } );
    const sprite = this.sprites[eid] = new three.Sprite( material );
    console.log( `Adding sprite ${eid}: Texture(${tid})`, this.scene.game.texturePaths );
    sprite.position.x = this.position.component.x[eid];
    sprite.position.y = this.position.component.y[eid];
    sprite.position.z = this.position.component.z[eid];
    // XXX: Figure out why the camera shows things very small unless
    // I do this.
    sprite.scale.multiplyScalar(16);
    this.scene._scene.add( sprite );
  }

  remove( eid:Number ) {
    this.scene._scene.remove( this.sprites[eid] );
    this.sprites[eid] = null;
  }
}
