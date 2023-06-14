
import type Project from '../Project.js';
import ProjectItem from '../ProjectItem.js';

/**
 * A Texture is a single texture. It may be a complete Image file or
 * a section of a larger image using an Atlas.
 */
export default class Texture extends ProjectItem {
  constructor( project:Project, path:string ) {
    super( project, path, "texture" );
  }
  /**
   * The source URI of the image containing this texture.
   */
  get src():string {
    return this.path.replace( /#.+$/, '' );
  }
  /**
   * The width of this Texture. If null, the rest of the Image should be
   * used.
   */
  width:number|null = null;
  /**
   * The height of this Texture. If null, the rest of the Image should be
   * used.
   */
  height:number|null = null;
  /**
   * The X-offset of this texture in its Image
   */
  x:number = 0;
  /**
   * The Y-offset of this texture in its Image
   */
  y:number = 0;
}
