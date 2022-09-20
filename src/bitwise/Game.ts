/**
 * Game is the entire Three.JS Scene. Games are made up of one or many
 * Scenes. Any number of Scenes may be active at once.
 */
import * as three from 'three';
import Scene from './Scene.ts';

export default class Game extends three.EventDispatcher {
  canvas:HTMLCanvasElement;
  loader:Object; // XXX: Need a real class here
  renderer:three.WebGLRenderer;

  width:Number = 0;
  height:Number = 0;

  scenes:Scene[] = [];

  constructor( opt:Object ) {
    super();
    this.canvas = opt.canvas;
    this.loader = opt.loader;
  }

  texturePaths:{ [key:string]: three.Texture } = {};
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
    return this.promises[path] = new Promise(
      (resolve, reject) => {
        const texture = loader.load( this.loader.base + path, resolve, undefined, reject ) 
        this.textures.push( texture );
        this.texturePaths[path] = this.textures.indexOf(texture);
      },
    );
  }

  start() {
    // Create the renderer after the <canvas> exists
    const renderer = new three.WebGLRenderer({
      canvas: this.canvas,
    });
    this.renderer = renderer;

    // Record the initial render height/width in case it changes. To
    // keep responsiveness, we will reset the renderer size and adjust the
    // camera so that everything looks the same.
    const { width, height } = this.renderSize();
    this.width = width;
    this.height = height;

    this.render();
  }

  stop() {
    this.renderer.dispose();
    this.renderer = null;
  }

  renderSize():three.Vector2 {
    const canvas = this.renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width  = canvas.clientWidth  * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    return new three.Vector2(width, height);
  }

  resizeRendererToDisplaySize() {
    const canvas = this.renderer.domElement;
    const render = this.renderSize();
    const needResize = canvas.width !== render.width || canvas.height !== render.height;
    if (needResize) {
      this.renderer.setSize(this.width, this.height, false);
      this.dispatchEvent({ type: 'resize', width: this.width, height: this.height });
    }
    return needResize;
  }

  render( timeMilli:DOMHighResTimeStamp=0 ) {
    if ( !this.renderer ) {
      return;
    }
    requestAnimationFrame( (t:DOMHighResTimeStamp) => this.render(t) );

    // XXX: Only run this if our ResizeObserver has gotten a hit.
    // https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
    this.resizeRendererToDisplaySize()

    SCENES:
    for ( const scene:Scene of this.scenes ) {
      switch (scene.state) {
        case "START":
          scene.render( this.renderer );
          scene.state = "RUN";
          continue SCENES;
        case "RUN":
          scene.update( timeMilli );
          // fall-through to render
        case "PAUSE":
          scene.render( this.renderer );
          continue SCENES;
      }
    }
  }

}
