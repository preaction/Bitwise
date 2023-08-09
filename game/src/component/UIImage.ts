
import * as bitecs from 'bitecs';
import Component from '../Component.js';
import Texture from '../Texture.js';

/**
 * How an image should fill the element.
 */
export enum FillType {
  /**
   * Stretch to fill the element.
   */
  Stretch = "stretch",
  /**
   * Tile to fill the element.
   */
  Repeat = "repeat",
  /**
   * Tile horizontally, stretch vertically.
   */
  RepeatX = "repeat-x",
  /**
   * Tile vertically, stretch horizontally.
   */
  RepeatY = "repeat-y",
};

/**
 * Adds a UI-style image to a {@link UIElement}.
 */
export default class UIImage extends Component {
  declare store:{
    imageId: number[],
  };
  get componentData() {
    return {
      imageId: bitecs.Types.eid,
    };
  }

  /**
   * How the image should fill the element.
   */
  fill:FillType[] = [];

  freezeEntity( eid:number ) {
    // Freeze always gives a texture path
    const data = super.freezeEntity(eid);
    data.imagePath = Texture.getById(data.imageId).path;
    delete data.imageId;
    data.fill = this.fill[eid] || 'stretch';
    return data;
  }
  thawEntity( eid:number, data:{ [key:string]:any }={} ) {
    this.fill[eid] = data.fill || 'stretch';
    // Thaw can work with an ID or a path
    let imageId = data.imageId;
    if ( !imageId && data.imagePath ) {
      imageId = this.scene.game.load.texture( data.imagePath );
    }
    super.thawEntity( eid, {imageId} );
  }
}
