
import * as bitecs from 'bitecs';
import Component from '../Component.js';

export default class BoxCollider extends Component {
  declare store:{
    ox: number[],
    oy: number[],
    oz: number[],
    sx: number[],
    sy: number[],
    sz: number[],
  }
  get componentData() {
    return {
      ox: bitecs.Types.f32,
      oy: bitecs.Types.f32,
      oz: bitecs.Types.f32,
      sx: bitecs.Types.f32,
      sy: bitecs.Types.f32,
      sz: bitecs.Types.f32,
    }
  }
}
