
import Scene from '../Scene.js';
import System from '../System.js';

export default class Null extends System {
  isNull:boolean = true;
  config:any;

  constructor( name:string, scene:Scene ) {
    super(name, scene);
  }

  freeze() {
    const data = super.freeze();
    return { ...data, ...this.config };
  }

  thaw( data:any ) {
    super.thaw(data);
    this.config = data;
  }

  update( timeMilli:number ) { }
}
