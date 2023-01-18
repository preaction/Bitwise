
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from './Scene.js';
import Component from './Component.js';

/**
 * System is the main way to customize game behavior. All game mechanics
 * will be implemented in System classes. Systems are registered on the
 * Game object and instantiated for use by each Scene object.
 */
export default class System extends three.EventDispatcher {
  name:string;
  scene:Scene;
  isNull:boolean = false;
  constructor( name:string, scene:Scene ) {
    super();
    this.name = name;
    this.scene = scene;
  }

  /**
   * Get the bitecs.World for the scene.
   */
  get world():bitecs.IWorld {
    return this.scene.world;
  }

  /**
   * Called after all systems have been constructed and entities have
   * been created. This method should begin loading external assets and
   * return a Promise that resolves when loading is complete. After the
   * Promise resolves, the start() method will be alled.
   */
  async init() { }

  /**
   * Called after all the init() Promises resolve. Once start() is
   * finished, the system will begin receiving update() and render()
   * calls until either pause() or stop() are called.
   */
  start() { }

  /**
   * Called when the scene is stopped. The system should reset itself so
   * that start() can be called again.
   */
  stop() { }

  /**
   * Called when the scene is paused. Indicates the system will no
   * longer be recieving update() calls, but will continue to recieve
   * render() calls. Updates will continue when resume() is called,
   * though it is also possible that updates will cease with a call to
   * stop().
   */
  pause() { }

  /**
   * Called when a paused scene is resumed. The system will start
   * receiving update() calls again.
   */
  resume() { }

  /**
   * update() is called for every frame while the scene is running. The
   * main game logic should be performed here. Before the update() call,
   * the Scene will fire the beforeUpdate event. After the update()
   * call, the Scene will fire the afterUpdate event.
   * After the updates are completed, the render() method will be
   * called.
   */
  update( timeMilli:number=0, timeTotal:number=0 ) { }

  /**
   * The render() method is called for every frame while the scene is
   * started. Unlike update(), render() is still called when the scene
   * is paused. Before the render() call, the Scene will fire the
   * beforeRender event. After the render() call, the Scene will fire
   * the afterRender event. After rendering is complete, the cycle
   * repeats with the update() method.
   */
  render() { }

  /**
   * Define a query for one or more Components.
   */
  defineQuery( components:Component[] ):bitecs.Query {
    // XXX: We don't need the actual component instance, we can look
    // that up from the scene and make this one less step
    // XXX: We can make the Component do this instead. Components should
    // manage data and be our model layer. Systems are the controller
    // layer.
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

  /**
   * Returns a path to the Vue 3 component that allows editing the
   * System's settings. This path is relative to the root of the
   * project. If your system has settings to edit in the Bitwise Editor,
   * you must also implement freeze() and thaw().
   */
  static get editorComponent():string {
    return '';
  }

  /**
   * freeze() builds an object out of this system's settings that can be
   * used as the modelValue for the editorComponent. The opposite of
   * thaw().
   */
  freeze():any {
    return {};
  }

  /**
   * thaw() takes the object from the editorComponent and updates this
   * system's settings. The opposite of freeze().
   */
  thaw(data:any) { }
}
