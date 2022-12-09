
import * as bitecs from 'bitecs';
import { Component } from '@fourstar/bitwise';

export default class Weapon extends Component {
  get componentData() {
    return {
      damage: bitecs.Types.f32,
    }
  }
}

