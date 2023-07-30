
import type Project from '../Project.js';
import ProjectItem from '../ProjectItem.js';
import Texture from './Texture.js';

/**
 * An Atlas divides a single image into multiple images.
 */
export default class Atlas extends ProjectItem {
  declare children:Texture[];
  constructor( project:Project, path:string ) {
    super(project, path, "atlas");
  }
  /**
   * Build an Atlas from the given XMLDocument. Chainable.
   */
  parseDOM( dom:XMLDocument ):Atlas {
    const imagePath = this.path.replace(
      /(\/?)[^\/]+$/,
      `$1${dom.documentElement.getAttribute('imagePath')}`,
    );
    this.children = [];
    for ( const node of dom.querySelectorAll('SubTexture') ) {
      const texturePath = `${this.path}/${node.getAttribute("name")}`;
      const texture = new Texture( this.project, texturePath );
      texture.src = imagePath;
      texture.x = parseInt( node.getAttribute("x") || "0" );
      texture.y = parseInt( node.getAttribute("y") || "0" );
      const width = node.getAttribute("width");
      if ( width ) {
        texture.width = parseInt(width);
      }
      const height = node.getAttribute("height");
      if ( height ) {
        texture.height = parseInt(height);
      }
      this.children.push(texture);
    }
    return this;
  }
}
