
import * as bitecs from 'bitecs';
import Component from '../Component.js';

export default class BoxCollider extends Component {
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
  static editorComponent():string {
    return 'component/bitwise/BoxCollider.vue';
  }
}
