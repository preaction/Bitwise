
import * as bitecs from 'bitecs';
import * as Ammo from 'ammo.js';
import System from 'bitwise/System.js';
import Physics from 'bitwise/system/Physics.js';
import Position from 'bitwise/component/Position.js';
import Input from 'bitwise/Input.js';
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
    console.log( `${eid} hit ${Array.from(hits).join(', ')}` );
  }

  update( timeMilli:number ) {
    if ( !this.input || !this.physics || !this.query ) {
      return;
    }
    const key = this.input.key;
    let x = 0, y = 0, z = 0, speed = 0.05;
    if ( key.left ) {
      x = key.up || key.down ? -Math.pow(2, .5) : -1;
    }
    else if ( key.right ) {
      x = key.up || key.down ? Math.pow(2, .5) : 1;
    }
    if ( key.up ) {
      y = key.left || key.right ? Math.pow(2, .5) : 1;
    }
    else if ( key.down ) {
      y = key.left || key.right ? -Math.pow(2, .5) : -1;
    }

    let vec = new Ammo.btVector3(x, y, z);
    if ( vec.length() > 0 ) {
      vec.normalize();
      vec.op_mul( timeMilli * speed );
    }

    const update = this.query(this.scene.world);
    for ( const eid of update ) {
      const rb = this.physics.bodies[eid];
      if ( !rb ) {
        continue;
      }
      rb.setLinearVelocity(vec);
      rb.activate();
    }
  }

}
