
import * as bitecs from 'bitecs';
import Component from '../Component.ts';

export default class Position extends Component {
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
}
