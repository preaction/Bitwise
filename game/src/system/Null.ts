
import Scene from '../Scene.js';
import System from '../System.js';

/**
 * The null system is used as a placeholder by the editor when it
 * can't find a configured system. Null system data cannot be
 * edited, but it will be preserved for when the missing system is
 * found.
 */
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
