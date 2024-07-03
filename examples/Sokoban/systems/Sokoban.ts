
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

  movement: three.Vector2 | null = null;

  async init() {
    // Get references to Components and Systems from this.scene
    this.input = this.scene.getSystem(Input);
    this.physics = this.scene.getSystem(Physics);
    this.transform = this.scene.getComponent(Transform);
    this.gridMovement = this.scene.getComponent(GridMovement);

    // Create queries with bitecs.Query
    this.gridQuery = this.defineQuery([this.gridMovement]);
  }

  start() {
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
    const moveLength = 250; // in ms
    // Are we moving? If so, keep moving until we're done
    if (this.movement) {
      const player = this.gridQuery(this.world);
      let moveAmount = timeMilli / moveLength;
      if (this.movement.x > 0) {
        moveAmount = Math.min(moveAmount, this.movement.x);
        this.movement.x -= moveAmount;
        for (const eid of player) {
          this.transform.store.x[eid] += moveAmount;
        }
      }
      else if (this.movement.x < 0) {
        moveAmount = Math.max(-moveAmount, this.movement.x);
        this.movement.x -= moveAmount;
        for (const eid of player) {
          this.transform.store.x[eid] += moveAmount;
        }
      }
      else if (this.movement.y > 0) {
        moveAmount = Math.min(moveAmount, this.movement.y);
        this.movement.y -= moveAmount;
        for (const eid of player) {
          this.transform.store.y[eid] += moveAmount;
        }
      }
      else if (this.movement.y < 0) {
        moveAmount = Math.max(-moveAmount, this.movement.y);
        this.movement.y -= moveAmount;
        for (const eid of player) {
          this.transform.store.y[eid] += moveAmount;
        }
      }

      if (this.movement.x === 0 && this.movement.y === 0) {
        this.movement = null;
      }
      else {
        return;
      }
    }

    // Otherwise, should we start moving?
    const key = this.input.key;
    if (key.left) {
      this.movement = new three.Vector2(-1, 0);
    }
    else if (key.right) {
      this.movement = new three.Vector2(1, 0);
    }
    else if (key.up) {
      this.movement = new three.Vector2(0, 1);
    }
    else if (key.down) {
      this.movement = new three.Vector2(0, -1);
    }
  }


  static get editorComponent(): string {
    // Path to the .vue component, if any
    return '';
  }
}
