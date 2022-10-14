
import * as bitecs from 'bitecs';
import Component from '../Component.js';

export default class RigidBody extends Component {
  get componentData() {
    return {
      mass: bitecs.Types.f32,
      vx: bitecs.Types.f32,
      vy: bitecs.Types.f32,
      vz: bitecs.Types.f32,
    }
  }
}
