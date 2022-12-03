/**
 * Game is the entire Three.JS Scene. Games are made up of one or many
 * Scenes. Any number of Scenes may be active at once.
 */
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene, { SceneState } from './Scene.js';
import Load from './Load.js';
import Input from './Input.js';
import Component from './Component.js';
import System from './System.js';

import PositionComponent from './component/Position.js';
import OrthographicCameraComponent from './component/OrthographicCamera.js';
import SpriteComponent from './component/Sprite.js';
import RigidBodyComponent from './component/RigidBody.js';
import BoxColliderComponent from './component/BoxCollider.js';

import RenderSystem from './system/Render.js';
import PhysicsSystem from './system/Physics.js';

import EditorRenderSystem from './system/editor/Render.js';
import EditorPhysicsSystem from './system/editor/Physics.js';

let tick = 0;

const DEFAULT_SYSTEMS = {
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

export interface ResizeEvent extends three.Event {
  width: number;
  height: number;
};

export default class Game extends three.EventDispatcher {
  canvas:HTMLCanvasElement;
  load:Load;
  renderer:three.WebGLRenderer|null = null;
  ecs:typeof bitecs;

  width:number = 0;
  height:number = 0;
  autoSize:boolean = true;

  initialScenePath:string = '';
  scenes:Scene[] = [];
  data:Object;
  input:Input;

  components:{ [key:string]: typeof Component } = {};
  systems:{ [key:string]: typeof System } = {};

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
    this.input = new Input( this );
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

  async start() {
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

    this.input.start();
    this.dispatchEvent({ type: 'start' });

    if ( this.initialScenePath ) {
      const scene = await this.loadScene( this.initialScenePath );
      await scene.init();
      scene.start();
    }

    this.render();
  }

  stop() {
    this.dispatchEvent({ type: 'stop' });
    this.input.stop();
    for ( const scene of this.scenes ) {
      scene.stop();
    }
    if ( this.renderer ) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }

  onResize() {
    this.resizeRendererToDisplaySize()
  }

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

  registerComponent( name:string, component:typeof Component ) {
    this.components[name] = component;
  }

  registerSystem( name:string, system:typeof System ) {
    this.systems[name] = system;
  }

  addScene() {
    const scene = new Scene( this );
    this.scenes.push( scene );
    return scene;
  }

  async loadScene( path:string ):Promise<Scene> {
    const res = await fetch(path);
    const sceneData = await res.json();
    const scene = this.addScene();
    scene.thaw( sceneData );
    return scene;
  }
}