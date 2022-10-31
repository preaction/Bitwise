
import Scene from './Scene.js';

export default class System {
  name:string;
  scene:Scene;
  constructor( name:string, scene:Scene ) {
    this.name = name;
    this.scene = scene;
  }
  static get editorComponent():string {
    return '';
  }
  freeze():any {
    return {};
  }
  thaw(data:any) { }
  update( timeMilli:number=0, timeTotal:number=0 ) { }
  render() { }
  start() { }
  pause() { }
  stop() { }
}
