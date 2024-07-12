
import * as bitecs from 'bitecs';
import { Component } from '@fourstar/bitwise';

export default class Crate extends Component {
  get componentData() {
    return {
      color: bitecs.Types.i8,
    };
  }

  declare store: {
    color: number[],
  }

  static get editorComponent(): string {
    // Path to the .vue component, if any
    return '';
  }
}
