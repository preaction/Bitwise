
import * as bitecs from 'bitecs';
import Scene from './Scene.ts';

export default class Component {
  world:any;
  store:any;
  scene:Scene;

  constructor( scene:Scene, world:any ) {
    this.scene = scene;
    this.world = world;
    this.store = bitecs.defineComponent( this.componentData );
  }
  addEntity( eid:Number ) {
    bitecs.addComponent( this.world, this.store, eid );
  }
  removeEntity( eid:Number ) {
    bitecs.removeComponent( this.world, this.store, eid );
  }
  thawEntity( eid:Number, data:Object ) {
    this.addEntity( eid );
    for ( const k in data ) {
      this.store[k][eid] = data[k];
    }
  }
  freezeEntity( eid:Number ) {
    const data = {};
    for ( const k in this.store ) {
      data[k] = this.store[k][eid];
    }
    return data;
  }
}

