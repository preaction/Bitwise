
import * as three from 'three';
import * as bitecs from 'bitecs';
import { Scene, System } from '@fourstar/bitwise';
import { Input, Physics } from '@fourstar/bitwise/system';
import { Transform } from '@fourstar/bitwise/component';
import GridMovement from '../components/GridMovement.ts';

export default class Sokoban extends System {
  input!: Input;
  physics!: Physics;
  transform!: Transform
  gridMovement!: GridMovement;
  gridQuery!: bitecs.Query;

  player: number = 0;
  moveTo: three.Vector3;
  velocity: three.Vector3;
  moving: boolean = false;
  moveDone: (x: number, y: number) => boolean;

  async init() {
    // Get references to Components and Systems from this.scene
    this.input = this.scene.getSystem(Input);
    this.physics = this.scene.getSystem(Physics);
    this.transform = this.scene.getComponent(Transform);
    this.gridMovement = this.scene.getComponent(GridMovement);

    // Create queries with bitecs.Query
    this.gridQuery = this.defineQuery([this.gridMovement]);

    this.moveTo = new three.Vector3();
    this.velocity = new three.Vector3();
  }

  start() {
    // Get the player EID
    this.player = this.gridQuery(this.world)[0];

    // Add event handlers
    this.input.watchKey('ArrowLeft', 'left');
    this.input.watchKey('ArrowRight', 'right');
    this.input.watchKey('ArrowUp', 'up');
    this.input.watchKey('ArrowDown', 'down');
  }

  stop() {
    // Remove event handlers
    // this.input.unwatchKey('ArrowLeft');
    // this.input.unwatchKey('ArrowRight');
    // this.input.unwatchKey('ArrowUp');
    // this.input.unwatchKey('ArrowDown');
  }

  update(timeMilli: number) {
    const eid = this.player;
    // Are we moving? If so, keep moving until we're done
    if (this.moving) {
      if (this.moveDone(this.transform.store.x[eid], this.transform.store.y[eid])) {
        this.moving = false;
        this.velocity.setScalar(0);
        this.physics.setVelocity(eid, this.velocity);
        this.physics.setPosition(eid, new three.Vector3(
          Math.round(this.transform.store.x[eid]),
          Math.round(this.transform.store.y[eid]),
          this.transform.store.z[eid],
        ));
        console.log(`${eid}: Finished movement to ${Math.round(this.transform.store.x[eid])}, ${Math.round(this.transform.store.y[eid])}`);
      }
      else {
        this.physics.applyForce(this.player, this.velocity);
        return;
      }
    }

    // Otherwise, should we start moving?
    const key = this.input.key;
    const VELOCITY = 10;
    if (key.left) {
      this.moving = true;
      const toX = this.transform.store.x[eid] - 1;
      this.moveDone = (x: number, y: number) => x <= toX;
      console.log(`${eid}: Moving to ${toX}, ${this.transform.store.y[eid]}`);
      this.velocity.set(-VELOCITY, 0, 0);
      this.physics.applyForce(eid, this.velocity);
    }
    else if (key.right) {
      this.moving = true;
      const toX = this.transform.store.x[eid] + 1;
      this.moveDone = (x: number, y: number) => x >= toX;
      console.log(`${eid}: Moving to ${toX}, ${this.transform.store.y[eid]}`);
      this.velocity.set(VELOCITY, 0, 0);
      this.physics.applyForce(eid, this.velocity);
    }
    else if (key.up) {
      this.moving = true;
      const toY = this.transform.store.y[eid] + 1;
      this.moveDone = (x: number, y: number) => y >= toY;
      console.log(`${eid}: Moving to ${this.transform.store.x[eid]}, ${toY}`);
      this.velocity.set(0, VELOCITY, 0);
      this.physics.applyForce(eid, this.velocity);
    }
    else if (key.down) {
      this.moving = true;
      const toY = this.transform.store.y[eid] - 1;
      this.moveDone = (x: number, y: number) => y <= toY;
      console.log(`${eid}: Moving to ${this.transform.store.x[eid]}, ${toY}`);
      this.velocity.set(0, -VELOCITY, 0);
      this.physics.applyForce(eid, this.velocity);
    }
  }


  static get editorComponent(): string {
    // Path to the .vue component, if any
    return '';
  }
}
