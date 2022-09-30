/**
 * Game is the entire Three.JS Scene. Games are made up of one or many
 * Scenes. Any number of Scenes may be active at once.
 */
import * as three from 'three';
import Scene from './Scene.ts';

let tick = 0;

export default class Game extends three.EventDispatcher {
  canvas:HTMLCanvasElement;
  loader:Object; // XXX: Need a real class here
  renderer:three.WebGLRenderer;

  width:Number = 0;
  height:Number = 0;
  autoSize:boolean = true;

  scenes:Scene[] = [];
  data:Object;

  constructor( opt:Object ) {
    super();
    this.canvas = opt.canvas;
    this.loader = opt.loader;
    this.width = opt.renderer?.width;
    this.height = opt.renderer?.height;
    this.data = opt.data || {};
    if ( this.width > 0 || this.height > 0 ) {
      this.autoSize = false;
    }
  }

  texturePaths:{ [key:Number]: string } = {};
  textureIds:{ [key:string]: Number } = {};
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
    this.render();
  }

  stop() {
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

  render( timeMilli:DOMHighResTimeStamp=0 ) {
    if ( !this.renderer ) {
      return;
    }

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

    requestAnimationFrame( (t:DOMHighResTimeStamp) => this.render(t) );
  }

  components:{ [key:string]: (Scene, Object) => Component } = {};
  registerComponent( name:string, component:( Scene, Object ) => Component ) {
    this.components[name] = component;
  }

  systems:{ [key:string]: (Scene) => System } = {};
  registerSystem( name:string, system:( Scene ) => System ) {
    this.systems[name] = system;
  }

  addScene() {
    const scene = new Scene( this );
    this.scenes.push( scene );
    return scene;
  }
}
