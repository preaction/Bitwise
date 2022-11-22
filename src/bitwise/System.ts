
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from './Scene.js';
import Component from './Component.js';

export default class System extends three.EventDispatcher {
  name:string;
  scene:Scene;
  isNull:boolean = false;
  constructor( name:string, scene:Scene ) {
    super();
    this.name = name;
    this.scene = scene;
  }
  static get editorComponent():string {
    return '';
  }

  /**
   * Get the bitecs.World for the scene.
   */
  get world():bitecs.IWorld {
    return this.scene.world;
  }

  init() { }
  start() { }
  stop() { }
  pause() { }
  resume() { }

  update( timeMilli:number=0, timeTotal:number=0 ) { }
  render() { }

  /**
   * Define a query for one or more Components.
   */
  defineQuery( components:Component[] ):bitecs.Query {
    // XXX: We don't need the actual component instance, we can look
    // that up from the scene and make this one less step
    return this.scene.game.ecs.defineQuery(components.map( c => c.store ));
  }

  /**
   * Define a query for when an entity starts being matched by a query.
   */
  enterQuery( query:bitecs.Query ):bitecs.Query {
    return this.scene.game.ecs.enterQuery(query);
  }

  /**
   * Define a query for when an entity stops being matched by a query.
   */
  exitQuery( query:bitecs.Query ):bitecs.Query {
    return this.scene.game.ecs.enterQuery(query);
  }

  /**
   * Remove a query.
   */
  removeQuery( query:bitecs.Query ) {
    // XXX: Track queries automatically and clean them up when the scene
    // stops
    return this.scene.game.ecs.removeQuery(this.scene.world, query);
  }

  freeze():any {
    return {};
  }
  thaw(data:any) { }
}
