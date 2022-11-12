
import * as bitecs from 'bitecs';
import Component from 'bitwise/Component.js';

export default class Enemy extends Component {
  static editorComponent = 'editor/Enemy.vue';
  get componentData() {
    return {
      health: bitecs.Types.ui8,
    }
  }
}

