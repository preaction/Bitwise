
import Scene from './Scene.js';

export default abstract class Component {
  world:any;
  store:{ [key:string]: Array<number> }
  scene:Scene;
  get componentData():Object { return {} };

  constructor( scene:Scene, world:any ) {
    this.scene = scene;
    this.world = world;
    this.store = scene.game.ecs.defineComponent( this.componentData );
  }
  static get editorComponent():string {
    return '';
  }
  addEntity( eid:number ) {
    this.scene.game.ecs.addComponent( this.world, this.store, eid );
  }
  removeEntity( eid:number ) {
    this.scene.game.ecs.removeComponent( this.world, this.store, eid );
  }
  thawEntity( eid:number, data:{ [key:string]: number } ) {
    this.addEntity( eid );
    for ( const k in data ) {
      this.store[k][eid] = data[k];
    }
  }
  freezeEntity( eid:number ):{ [key:string]: number } {
    const data: { [key:string]: number } = {};
    for ( const k in this.store ) {
      data[k] = this.store[k][eid];
    }
    return data;
  }
}

