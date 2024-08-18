
import * as bitecs from 'bitecs';
import Component from '../Component.js';

/**
 * Adds a box-shaped collision area to an entity. Colliders are used by
 * the {@link system.Physics} system to provide the entity a volume. Entities
 * that also have the {@link RigidBody} component are movable and have
 * mass. Entities without a body are static, like platforms or
 * obstacles.
 */
export default class BoxCollider extends Component {
  declare store: {
    trigger: number[],
    ox: number[],
    oy: number[],
    oz: number[],
    sx: number[],
    sy: number[],
    sz: number[],
  }
  get componentData() {
    return {
      trigger: bitecs.Types.ui8,
      ox: bitecs.Types.f32,
      oy: bitecs.Types.f32,
      oz: bitecs.Types.f32,
      sx: bitecs.Types.f32,
      sy: bitecs.Types.f32,
      sz: bitecs.Types.f32,
    }
  }

  addEntity(eid: number) {
    super.addEntity(eid);
    this.store.trigger[eid] = 0;
    this.store.ox[eid] = 0;
    this.store.oy[eid] = 0;
    this.store.oz[eid] = 0;
    this.store.sx[eid] = 1;
    this.store.sy[eid] = 1;
    this.store.sz[eid] = 1;
  }
}
