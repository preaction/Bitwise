
import Scene from '../Scene.js';
import Component from '../Component.js';

/**
 * The null component is used as a placeholder by the editor when it
 * can't find a configured component. Null component data cannot be
 * edited, but it will be preserved for when the missing component is
 * found.
 */
export default class Null extends Component {
  isNull:boolean = true;
  declare store:any;
  constructor( scene:Scene, world:any ) {
    super(scene, world);
  }
  get componentData() {
    return {};
  }
}
