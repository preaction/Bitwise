
import * as bitecs from 'bitecs';
import Component from '../Component.js';

export default class Sprite extends Component {
  declare store:{
    textureId: number[],
  }

  get componentData() {
    return {
      textureId: bitecs.Types.ui8,
    }
  }

  freezeEntity( eid:number ) {
    const data = super.freezeEntity(eid);
    data.texturePath = this.scene.game.load.texturePaths[data.textureId];
    delete data.textureId;
    return data;
  }
  thawEntity( eid:number, data:{ [key:string]:any } ) {
    const textureId = this.scene.game.load.texture( data.texturePath );
    super.thawEntity( eid, {textureId} );
  }
}
