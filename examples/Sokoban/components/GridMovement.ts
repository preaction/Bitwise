
import * as bitecs from 'bitecs';
import { Component } from '@fourstar/bitwise';

export default class GridMovement extends Component {
  get componentData() {
    return {
      // fieldName: bitecs.Types.f32
    };
  }

  declare store: {
    // fieldName: number[],
  }

  static get editorComponent(): string {
    // Path to the .vue component, if any
    return '';
  }
}
