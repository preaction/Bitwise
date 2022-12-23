
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene, { SceneState } from './Scene.js';
import Load from './Load.js';
import Component from './Component.js';
import System from './System.js';

import PositionComponent from './component/Position.js';
import OrthographicCameraComponent from './component/OrthographicCamera.js';
import SpriteComponent from './component/Sprite.js';
import RigidBodyComponent from './component/RigidBody.js';
import BoxColliderComponent from './component/BoxCollider.js';

import InputSystem from './system/Input.js';
import RenderSystem from './system/Render.js';
import PhysicsSystem from './system/Physics.js';

import EditorRenderSystem from './system/editor/Render.js';
import EditorPhysicsSystem from './system/editor/Physics.js';

const DEFAULT_SYSTEMS = {
  Input: InputSystem,
  Render: RenderSystem,
  Physics: PhysicsSystem,
  // XXX: Default systems should load their own editor system if they
  // have one? Is there a way to keep editor systems out of the full
  // game build?
  EditorRender: EditorRenderSystem,
  EditorPhysics: EditorPhysicsSystem,
};

const DEFAULT_COMPONENTS = {
  Position: PositionComponent,
  OrthographicCamera: OrthographicCameraComponent,
  Sprite: SpriteComponent,
  RigidBody: RigidBodyComponent,
  BoxCollider: BoxColliderComponent,
};

/**
 * ResizeEvent is dispatched by Game when the canvas element is resized.
 */
export interface ResizeEvent extends three.Event {
  width: number;
  height: number;
};

/**
 * Game is main game container. Games are made up of one or many Scenes.
 * Any number of Scenes may be active at once.
 */
export default class Game extends three.EventDispatcher {
  canvas:HTMLCanvasElement;
  load:Load;
  renderer:three.WebGLRenderer|null = null;
  ecs:typeof bitecs;

  width:number = 0;
  height:number = 0;
  autoSize:boolean = true;

  /**
   * The path to the JSON file containing initial scene to load. If set,
   * the game will start this scene immediately when start() is called.
   */
  initialScenePath:string = '';
  scenes:Scene[] = [];
  data:Object;

  components:{ [key:string]: typeof Component } = {};
  systems:{ [key:string]: typeof System } = {};

  /**
   * The config property provides the default configuration values for
   * the game. These values can be overridden by the config passed to
   * the game's constructor.
   */
  // XXX: define game constructor options object type
  get config():any { return {} }

  constructor( opt:any ) {
    super();
    const conf = this.config;
    // XXX: Config should be merged with options
    this.ecs = bitecs;
    this.canvas = opt.canvas;
    this.load = new Load( opt.loader || {} );
    this.width = opt.renderer?.width || conf.renderer?.width;
    this.height = opt.renderer?.height || conf.renderer?.height;
    this.data = opt.data || {};
    if ( this.width > 0 || this.height > 0 ) {
      this.autoSize = false;
    }
    this.initialScenePath = opt.scene || '';
    this.components = {
      ...DEFAULT_COMPONENTS,
      ...conf.components,
      ...opt.components,
    };
    this.systems = {
      ...DEFAULT_SYSTEMS,
      ...conf.systems,
      ...opt.systems,
    };
  }

  /**
   * Start the game. Sets up the renderer and canvas as needed, and
   * launches the initial scene if initialScenePath is set.
   */
  async start():Promise<any> {
    // Create the renderer after the <canvas> exists
    const renderer = new three.WebGLRenderer({
      canvas: this.canvas,
    });
    this.renderer = renderer;

    if ( this.autoSize ) {
      // Record the initial render height/width in case it changes. To
      // keep responsiveness, we will reset the renderer size and adjust the
      // camera so that everything looks the same.
      const { width, height } = this.renderSize();
      this.width = width;
      this.height = height;
      window.addEventListener( 'resize', this.onResize.bind(this) );
    }

    this.renderer.setSize(this.width, this.height, false);

    this.dispatchEvent({ type: 'start' });

    if ( this.initialScenePath ) {
      const scene = await this.loadScene( this.initialScenePath );
      await scene.init();
      scene.start();
    }

    this.render();
  }

  /**
   * Stop the game. Stops any running scenes and cleans up anything
   * created by start()
   */
  stop() {
    this.dispatchEvent({ type: 'stop' });
    for ( const scene of this.scenes ) {
      scene.stop();
    }
    if ( this.renderer ) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }

  /**
   * onResize handles the window resize event. See
   * resizeRendererToDisplaySize()
   */
  protected onResize() {
    this.resizeRendererToDisplaySize()
  }

  /**
   * renderSize gets the size of the canvas in screen pixels (so, using
   * the device's pixel ratio).
   */
  renderSize():three.Vector2 {
    if ( !this.renderer ) {
      return new three.Vector2(0, 0);
    }
    const canvas = this.renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width  = canvas.clientWidth  * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    const vec = new three.Vector2(width, height);
    return vec;
  }

  /**
   * resizeRendererToDisplaySize resizes the renderer to match the
   * canvas's aspect ratio. This ensures that objects being rendered are
   * not stretched or squished.
   */
  resizeRendererToDisplaySize() {
    if ( !this.renderer ) {
      return;
    }
    const canvas = this.renderer.domElement;
    const render = this.renderSize();
    const needResize = canvas.width !== render.width || canvas.height !== render.height;
    if (needResize) {
      this.renderer.setSize(render.width, render.height, false);
      this.dispatchEvent({ type: 'resize', width: render.width, height: render.height });
    }
    return needResize;
  }

  /**
   * render is the main game loop. It handles all Scene state changes
   * and dispatches the appropriate scene update() and render() calls.
   */
  render( timeMilli:DOMHighResTimeStamp=0, timeTotal:DOMHighResTimeStamp=0 ) {
    if ( !this.renderer ) {
      return;
    }

    this.dispatchEvent({ type: 'beforeRender' });
    SCENES:
    for ( const scene of this.scenes ) {
      switch (scene.state) {
        case SceneState.Start:
          scene.render();
          scene.state = SceneState.Run;
          continue SCENES;
        case SceneState.Run:
          scene.update( timeMilli );
          // fall-through to render
        case SceneState.Pause:
          scene.render();
          continue SCENES;
      }
    }
    this.dispatchEvent({ type: 'afterRender' });

    requestAnimationFrame( (t:DOMHighResTimeStamp) => this.render(t-timeTotal, t) );
  }

  /**
   * registerComponent registers a new component constructor. This
   * component can then be used by scenes.
   */
  registerComponent( name:string, component:typeof Component ) {
    this.components[name] = component;
  }

  /**
   * registerSystem registers a new system constructor. This system can
   * then be used by scenes.
   */
  registerSystem( name:string, system:typeof System ) {
    this.systems[name] = system;
  }

  /**
   * addScene creates a new, blank scene object. Once the scene is
   * constructed, add systems, components, and entities or load its data
   * with the Scene.thaw() method.
   */
  addScene() {
    const scene = new Scene( this );
    this.scenes.push( scene );
    return scene;
  }

  /**
   * loadScene loads the JSON at the given path and uses it to create
   * a new Scene object.
   */
  async loadScene( path:string ):Promise<Scene> {
    const sceneData = await this.load.json(path);
    const scene = this.addScene();
    scene.thaw( sceneData );
    return scene;
  }
}
