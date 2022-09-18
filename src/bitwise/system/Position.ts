
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from './Scene.ts';

export default class Position {
  scene:Scene;

  constructor( scene:Scene ) {
    this.scene = scene;
    this.component = bitecs.defineComponent( this.componentData );
  }

  get componentData() {
    return {
      x: bitecs.Types.f32,
      y: bitecs.Types.f32,
      z: bitecs.Types.f32,
    }
  }

}
