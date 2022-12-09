
import * as bitecs from 'bitecs';
import { Component } from '@fourstar/bitwise';

export default class Player extends Component {
  declare store: {
    weapon: number[],
  };
  static get editorComponent(): string {
    return 'component/Player.vue';
  }
  static paths:string[] = [ 'Unknown' ];
  get componentData() {
    return {
      weapon: bitecs.Types.eid,
    }
  }

  override thawEntity(eid: number, data: {[key: string]: any;}): void {
    const copy = {...data};
    if ( data.weapon ) {
      const weaponId = Player.paths.length;
      Player.paths.push(data.weapon);
      copy.weapon = weaponId;
    }
    super.thawEntity(eid, copy);
  }

  override freezeEntity(eid: number): {[key: string]: any;} {
    const data = super.freezeEntity(eid);
    if ( data.weapon ) {
      data.weapon = Player.paths[ data.weapon ];
    }
    return data;
  }
}

