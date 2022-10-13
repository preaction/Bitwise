
import * as bitecs from 'bitecs';
import Component from '../Component.js';

export default class OrthographicCamera extends Component {
  get componentData() {
    return {
      frustum: bitecs.Types.f32,
      zoom: bitecs.Types.f32,
      near: bitecs.Types.f32,
      far: bitecs.Types.f32,
    };
  }
  static editorComponent():string {
    return 'component/bitwise/OrthographicCamera.vue';
  }
}
