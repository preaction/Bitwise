
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from './Scene.ts';

export default class Parent {
  scene:Scene;

  constructor( scene:Scene ) {
    this.scene = scene;
    this.component = bitecs.defineComponent( this.componentData );
  }

  get componentData() {
    return {
      id: bitecs.Types.eid,
    }
  }

}
