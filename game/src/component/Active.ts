
import Component from '../Component.js';

/**
 * The Active component declares an entity as "active". Active entities
 * are being rendered and updated. Active entities are added to scenes
 * at start.
 */
export default class Active extends Component {
  declare store:never;
  static isHidden:boolean = true;
  get componentData() {
    return {};
  }
}
