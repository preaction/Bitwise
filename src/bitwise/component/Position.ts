
import * as bitecs from 'bitecs';
import Component from '../Component.ts';

export default class Position extends Component {
  get componentData() {
    return {
      x: bitecs.Types.f32,
      y: bitecs.Types.f32,
      z: bitecs.Types.f32,
    }
  }
}
