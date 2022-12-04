
import * as bitecs from 'bitecs';
import { System } from '@fourstar/bitwise';
import { Physics } from '@fourstar/bitwise/system';
import Enemy from '../component/Enemy.js';

export default class Boundary extends System {
  queries:bitecs.Query[] = [];
  physics?:Physics;
  seen:Set<number> = new Set();

  static editorComponent = 'editor/system/Boundary.vue';

  start() {
    const scene = this.scene;
    const enemy = scene.getComponent(Enemy);
    this.queries.push( scene.game.ecs.defineQuery([enemy.store]) );

    //const query = scene.game.ecs.defineQuery([ component.store ]);
    this.physics = scene.getSystem( Physics );
    //this.physics.watchQuery( query, this.onCollide.bind(this) );
  }

  boundaryPath:string = "";

  thaw( data:any ) {
    this.boundaryPath = data.boundaryPath;
  }

  freeze():any {
    const data = super.freeze();
    data.boundaryPath = this.boundaryPath;
    return data;
  }

  onCollide( eid:number, hits:Set<number> ) {
    for ( const hit of hits ) {
      this.seen.add(hit);
    }
  }

  update( timeMilli:number ) {
    for ( const q of this.queries ) {
      const entities = q( this.scene.world );
      for ( const eid of entities ) {
        if ( !this.seen.has( eid ) ) {
          //console.log( `${eid} is out of bounds` );
        }
      }
    }
    this.seen = new Set();
  }

}
