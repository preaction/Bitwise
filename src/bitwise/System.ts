
import Scene from './Scene.js';

export default class System {
  name:string;
  scene:Scene;
  constructor( name:string, scene:Scene, data:Object ) {
    this.name = name;
    this.scene = scene;
    // XXX: We can't thaw here because it comes before any defaults are
    // initialized by the superclass...
  }
  static get editorComponent():string {
    return '';
  }
  freeze() {
    return {};
  }
  thaw(data:any) {
  }
  update( timeMilli:number=0, timeTotal:number=0 ) { }
  render() { }
  start() { }
  pause() { }
  stop() { }
}
