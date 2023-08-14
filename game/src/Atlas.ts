
import Asset from './Asset.js';
import Texture from './Texture.js';

/**
 * An Atlas divides a single image into multiple images.
 */
export default class Atlas extends Asset {
  declare children:Texture[];

  /**
   * The path to the image containing these textures.
   */
  imagePath!:string;

  /**
   * Build an Atlas from the given XMLDocument. Chainable.
   */
  parseDOM( dom:XMLDocument ):Atlas {
    const imagePath = this.path.replace(
      /(\/?)[^\/]+$/,
      `$1${dom.documentElement.getAttribute('imagePath')}`,
    );
    this.imagePath = imagePath;
    this.children = [];
    for ( const node of dom.querySelectorAll('SubTexture') ) {
      const texturePath = `${this.path}/${node.getAttribute("name")}`;
      const texture = new Texture( this.load, texturePath );
      texture.src = imagePath;
      texture.x = parseInt( node.getAttribute("x") || "0" );
      texture.y = parseInt( node.getAttribute("y") || "0" );
      texture.atlas = this;
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

Asset.register( Atlas );
