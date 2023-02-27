
import * as bitecs from 'bitecs';
import Component from '../Component.js';

/**
 * Adds a sprite texture to a game object. Sprites are unique in that
 * they always face the camera and cannot be rotated.
 */
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
    // Freeze always gives a texture path
    const data = super.freezeEntity(eid);
    data.texturePath = this.scene.game.load.texturePaths[data.textureId];
    delete data.textureId;
    return data;
  }
  thawEntity( eid:number, data:{ [key:string]:any }={} ) {
    // Thaw can work with an ID or a path
    let textureId = data.textureId;
    if ( !textureId && data.texturePath ) {
      textureId = this.scene.game.load.texture( data.texturePath );
    }
    super.thawEntity( eid, {textureId} );
  }
}
