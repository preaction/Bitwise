
import * as bitecs from 'bitecs';
import * as Ammo from 'ammo.js';
import { System, Input } from '@fourstar/bitwise';
import { Physics } from '@fourstar/bitwise/system';
import { Position } from '@fourstar/bitwise/component';
import Player from '../component/Player.js';

export default class Movement extends System {
  position?:Position;
  input?:Input;
  physics?:Physics;
  query?:bitecs.Query;

  start() {
    const scene = this.scene;
    this.position = scene.getComponent(Position);
    const player = scene.getComponent( Player );
    const query = this.query = scene.game.ecs.defineQuery([ player.store ]);

    this.physics = scene.getSystem( Physics );
    this.physics.watchQuery( query, this.onCollide.bind(this) );

    this.input = scene.game.input;
    if ( this.input ) {
      this.input.watchKey( 'ArrowLeft', 'left' );
      this.input.watchKey( 'ArrowRight', 'right' );
      this.input.watchKey( 'ArrowUp', 'up' );
      this.input.watchKey( 'ArrowDown', 'down' );
    }
  }

  onCollide( eid:number, hits:Set<number> ) {
    //console.log( `${eid} hit ${Array.from(hits).join(', ')}` );
  }

  update( timeMilli:number ) {
    if ( !this.input || !this.physics || !this.query ) {
      return;
    }
    const key = this.input.key;
    const x = key.left ? -1 : key.right ? 1 : 0;
    const y = key.down ? -1 : key.up ? 1 : 0;
    const z = 0;
    const speed = 0.5;

    let vec = new Ammo.btVector3(x, y, z);
    if ( vec.length() > 0 ) {
      vec.normalize();
      vec = vec.op_mul( timeMilli * speed );
    }

    const update = this.query(this.scene.world);
    for ( const eid of update ) {
      const rb = this.physics.bodies[eid];
      if ( !rb ) {
        continue;
      }
      console.log( `${eid}: Setting velocity: ${vec.x()}, ${vec.y()}, ${vec.z()}` );
      rb.activate();
      rb.setLinearVelocity(vec);
    }
  }

}
