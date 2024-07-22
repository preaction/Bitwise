
import * as bitecs from 'bitecs';
import Component from '../Component.js';

/**
 * Defines an entity's transformation in 3D space, including translation
 * (position), rotation, and scale.
 */
export default class Transform extends Component {
  declare store: {
    x: number[],
    y: number[],
    z: number[],
    rx: number[],
    ry: number[],
    rz: number[],
    rw: number[],
    sx: number[],
    sy: number[],
    sz: number[],
  }

  get componentData() {
    return {
      x: bitecs.Types.f32,
      y: bitecs.Types.f32,
      z: bitecs.Types.f32,
      rx: bitecs.Types.f32,
      ry: bitecs.Types.f32,
      rz: bitecs.Types.f32,
      rw: bitecs.Types.f32,
      sx: bitecs.Types.f32,
      sy: bitecs.Types.f32,
      sz: bitecs.Types.f32,
    }
  }

  addEntity(eid: number) {
    super.addEntity(eid);
    this.store.x[eid] = 0;
    this.store.y[eid] = 0;
    this.store.z[eid] = 0;
    this.store.sx[eid] = 1;
    this.store.sy[eid] = 1;
    this.store.sz[eid] = 1;
    this.store.rx[eid] = 0;
    this.store.ry[eid] = 0;
    this.store.rz[eid] = 0;
    this.store.rw[eid] = 1;
  }
}
