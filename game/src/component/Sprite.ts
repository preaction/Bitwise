
import * as bitecs from 'bitecs';
import Asset from '../Asset.js';
import Component from '../Component.js';
import Texture from '../Texture.js';

/**
 * Adds a sprite texture to a game object. Sprites are unique in that
 * they always face the camera and cannot be rotated.
 */
export default class Sprite extends Component {
  declare store: {
    textureId: number[],
    repeatX: number[],
    repeatY: number[],
  }

  get componentData() {
    return {
      textureId: bitecs.Types.ui8,
      repeatX: bitecs.Types.ui8,
      repeatY: bitecs.Types.ui8,
    }
  }

  freezeEntity(eid: number) {
    // Freeze always gives a texture ref
    const data = super.freezeEntity(eid);
    data.texture = Texture.getById(data.textureId).ref();
    delete data.textureId;
    return data;
  }
  async thawEntity(eid: number, rawData: { [key: string]: any } = {}) {
    const data = { ...rawData };
    // Thaw can work with an ID, path, or ref
    let textureId = data.textureId;
    if (!textureId) {
      if (data.texturePath) {
        textureId = this.scene.game.load.texture(data.texturePath);
        delete data.texturePath;
      }
      else if (data.texture) {
        if (typeof data.texture === 'string') {
          textureId = this.scene.game.load.texture(data.texture);
        }
        else {
          const texture = await Asset.deref(this.scene.game.load, data.texture) as Texture;
          textureId = texture.textureId;
        }
        delete data.texture;
      }
      data.textureId = textureId;
    }
    return super.thawEntity(eid, data);
  }
}
