
import Scene from '../Scene.js';
import Component from '../Component.js';

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
