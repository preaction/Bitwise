
import * as bitecs from 'bitecs';
import Component from '../Component.js';

export default class OrthographicCamera extends Component {
  declare store:{
    frustum: number[],
    zoom: number[],
    near: number[],
    far: number[],
  }
  get componentData() {
    return {
      frustum: bitecs.Types.f32,
      zoom: bitecs.Types.f32,
      near: bitecs.Types.f32,
      far: bitecs.Types.f32,
    };
  }
}
