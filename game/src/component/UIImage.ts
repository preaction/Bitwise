
import * as bitecs from 'bitecs';
import Component from '../Component.js';

export default class UIImage extends Component {
  declare store:{
    imageId: number[],
  };
  get componentData() {
    return {
      imageId: bitecs.Types.eid,
    };
  }

  freezeEntity( eid:number ) {
    // Freeze always gives a texture path
    const data = super.freezeEntity(eid);
    data.imagePath = this.scene.game.load.texturePaths[data.imageId];
    delete data.imageId;
    return data;
  }
  thawEntity( eid:number, data:{ [key:string]:any }={} ) {
    // Thaw can work with an ID or a path
    let imageId = data.imageId;
    if ( !imageId && data.imagePath ) {
      imageId = this.scene.game.load.texture( data.imagePath );
    }
    super.thawEntity( eid, {imageId} );
  }
}
