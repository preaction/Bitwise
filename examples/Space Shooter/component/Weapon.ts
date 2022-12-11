
import * as bitecs from 'bitecs';
import { Component } from '@fourstar/bitwise';

export default class Weapon extends Component {
  declare store:{
    damage: number[],
    cooldown: number[],
  }
  static get editorComponent(): string {
    return 'component/Weapon.vue';
  }
  get componentData() {
    return {
      damage: bitecs.Types.f32,
      cooldown: bitecs.Types.f32,
    }
  }
}

