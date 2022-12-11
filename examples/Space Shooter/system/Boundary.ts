
import * as bitecs from 'bitecs';
import { System } from '@fourstar/bitwise';
import { Physics } from '@fourstar/bitwise/system';

export default class Boundary extends System {
  physics!:Physics;
  seen:Set<number> = new Set();
  boundaryPath:string = "";


  static editorComponent = 'editor/system/Boundary.vue';

  async init() {
    this.physics = this.scene.getSystem( Physics );
  }

  start() {
    const boundary = this.scene.getEntityByPath( this.boundaryPath );
    if ( boundary ) {
      console.log( `Boundary ID: ${boundary.id}` );
      this.physics.watchEnter( boundary.id, this.onCollideEnter.bind(this) );
      this.physics.watchExit( boundary.id, this.onCollideExit.bind(this) );
    }
  }

  thaw( data:any ) {
    this.boundaryPath = data.boundaryPath;
  }

  freeze():any {
    const data = super.freeze();
    data.boundaryPath = this.boundaryPath;
    return data;
  }

  onCollideEnter( eid:number, hits:Set<number> ) {
    console.log( `${eid} entered ${Array.from(hits).join(', ')}` );
  }

  onCollideExit( eid:number, hits:Set<number> ) {
    console.log( `${eid} exited ${Array.from(hits).join(', ')}` );
    for ( const leftEid of hits ) {
      this.scene.removeEntity( leftEid );
    }
  }

  update( timeMilli:number ) {
  }

}
