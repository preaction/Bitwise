
import * as bitecs from 'bitecs';
import Component from '../Component.js';

/**
 * Add the entity to the physics simulation (provided by the {@link
 * system.Physics} system). A rigid body can be moved with physics forces.
 * Entities should also get a collider component (like {@link
 * BoxCollider}) to be able to collide with other physical objects.
 */
export default class RigidBody extends Component {
  declare store: {
    mass: number[],
    vx: number[],
    vy: number[],
    vz: number[],
    rx: number[],
    ry: number[],
    rz: number[],
    lx: number[],
    ly: number[],
    lz: number[],
    ld: number[],
    ax: number[],
    ay: number[],
    az: number[],
    ad: number[],
  }
  get componentData() {
    return {
      mass: bitecs.Types.f32,
      vx: bitecs.Types.f32,
      vy: bitecs.Types.f32,
      vz: bitecs.Types.f32,
      rx: bitecs.Types.f32,
      ry: bitecs.Types.f32,
      rz: bitecs.Types.f32,
      lx: bitecs.Types.f32,
      ly: bitecs.Types.f32,
      lz: bitecs.Types.f32,
      ld: bitecs.Types.f32,
      ax: bitecs.Types.f32,
      ay: bitecs.Types.f32,
      az: bitecs.Types.f32,
      ad: bitecs.Types.f32,
    }
  }
}
