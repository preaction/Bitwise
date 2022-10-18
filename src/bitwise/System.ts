
import Scene from './Scene.js';

export default class System {
  name:string;
  scene:Scene;
  constructor( name:string, scene:Scene, data:Object ) {
    this.name = name;
    this.scene = scene;
  }
  freeze() {
    return {
      name: this.name,
      data: {},
    };
  }
  update( timeMilli:number=0, timeTotal:number=0 ) { }
  render() { }
}
