/**
 * Game is the entire Three.JS Scene. Games are made up of one or many
 * Scenes. Any number of Scenes may be active at once.
 */
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from './Scene.js';
import Input from './Input.js';
import Component from './Component.js';
import System from './System.js';

import PositionComponent from './component/Position.ts';
import OrthographicCameraComponent from './component/OrthographicCamera.ts';
import SpriteComponent from './component/Sprite.ts';
import RigidBodyComponent from './component/RigidBody.ts';
import BoxColliderComponent from './component/BoxCollider.ts';

import SpriteSystem from './system/Sprite.ts';
import RenderSystem from './system/Render.ts';
import PhysicsSystem from './system/Physics.ts';

import EditorRenderSystem from './system/editor/Render.ts';
import EditorPhysicsSystem from './system/editor/Physics.ts';

let tick = 0;

const DEFAULT_SYSTEMS = {
  Sprite: SpriteSystem,
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

export default class Game extends three.EventDispatcher {
  canvas:HTMLCanvasElement;
  loader:Object; // XXX: Need a real class here
  renderer:three.WebGLRenderer = null;
  ecs:typeof bitecs;

  width:number = 0;
  height:number = 0;
  autoSize:boolean = true;

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
    this.loader = opt.loader;
    this.width = opt.renderer?.width || conf.renderer?.width;
    this.height = opt.renderer?.height || conf.renderer?.height;
    this.data = opt.data || {};
    this.input = new Input( this );
    if ( this.width > 0 || this.height > 0 ) {
      this.autoSize = false;
    }
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

  texturePaths:{ [key:number]: string } = {};
  textureIds:{ [key:string]: number } = {};
  textures:three.Texture[] = [];
  promises:{ [key:string]: Promise } = {};

  loadTexture( path:string ) {
    if ( this.promises[path] ) {
      return this.promises[path];
    }
    // XXX: Load the texture, and keep track of the promises we make
    // for loading purposes.
    // XXX: We may want to make a general "loader" object that can be used
    // for progress reporting.
    const loader = new three.TextureLoader();
    const promise = this.promises[path] = new Promise(
      (resolve, reject) => {
        const texture = loader.load( this.loader.base + path, resolve, undefined, reject ) 
        this.textures.push( texture );
        this.texturePaths[this.textures.indexOf(texture)] = path;
        this.textureIds[ path ] = this.textures.indexOf(texture);
        console.log( `Loading texture ${path} (${this.textureIds[path]})` );
      },
    );
    promise.then( () => this.scenes.forEach( s => s.render() ) );
    return promise;
  }

  start() {
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

    this.render();
  }

  stop() {
    this.dispatchEvent({ type: 'stop' });
    this.input.stop();
    this.renderer.dispose();
    this.renderer = null;
  }

  onResize() {
    this.resizeRendererToDisplaySize()
  }

  renderSize():three.Vector2 {
    const canvas = this.renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width  = canvas.clientWidth  * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    const vec = new three.Vector2(width, height);
    return vec;
  }

  resizeRendererToDisplaySize() {
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
    for ( const scene:Scene of this.scenes ) {
      switch (scene.state) {
        case "START":
          scene.render();
          scene.state = "RUN";
          continue SCENES;
        case "RUN":
          scene.update( timeMilli );
          // fall-through to render
        case "PAUSE":
          scene.render();
          continue SCENES;
      }
    }
    this.dispatchEvent({ type: 'afterRender' });

    requestAnimationFrame( (t:DOMHighResTimeStamp) => this.render(t-timeTotal, t) );
  }

  registerComponent( name:string, component:( Scene, Object ) => Component ) {
    this.components[name] = component;
  }

  registerSystem( name:string, system:( Scene ) => System ) {
    this.systems[name] = system;
  }

  addScene() {
    const scene = new Scene( this );
    this.scenes.push( scene );
    return scene;
  }
}
