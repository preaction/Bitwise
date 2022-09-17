/**
 * Scene is the top level of Three.JS Object3D. It also contains
 * a BitECS World, contains the Entities, and holds on to the BitECS
 * systems.
 *
 * Scene can be extended to create more specialized APIs. For example,
 * a UIScene could have methods to manipulate UI components layout, or
 * a Scene2D could have methods to change parts of the map.
 *
 * Scene Systems are re-usable components for Scenes. A Physics System
 * may have corresponding Physics components on Entities.
 */
import * as three from 'three';
import Game from './Game.ts';
import OrthographicCamera from './component/OrthographicCamera.ts';
import Tileset from './Tileset.ts';
import { Tilemap, Tile } from './Tilemap.ts';

// SceneState is the current state of the scene.
// XXX: This should be in a separate class so it can be exported
enum SceneState {
  // Stop means the scene is not rendering or updating.
  Stop = "STOP",
  // Start means the scene is getting ready to start. The scene will get
  // one call to render() at the next frame and then its state will be
  // set to Run.
  Start = "START",
  // Run means the scene is getting update() and render() calls, in that
  // order.
  Run = "RUN", // Scene is rendering and updating
  // Pause means the scene is getting render() calls, but not update()
  // calls.
  Pause = "PAUSE",
}

export default class Scene extends three.EventDispatcher {
  game:Game;
  state:SceneState = SceneState.Stop;
  _scene:three.Scene = new three.Scene();

  // XXX: This should be components in entities
  camera:OrthographicCamera;

  constructor( game:Game ) {
    super();
    this.game = game;
    game.addEventListener( "resize", (e:Object) => this.dispatchEvent("resize", e) );
  }

  // start() should initialize the scene and get it ready to be
  // rendered. When the scene is ready, it should set its state to
  // "Start".
  async start() {
    // Load tileset
    const tileset = new Tileset({
      src: this.game.loader.base + "Tilesets/TS_Dirt.png",
      tileWidth: 16,
    });
    await tileset.load();

    // Add tilemap
    const tilemap = new Tilemap();
    tilemap.addTileset( "dirt", tileset );
    tilemap.setTile( new three.Vector2(0, 0), "dirt", 3 );
    this._scene.add( tilemap );

    this.camera = new OrthographicCamera();
    this.camera.addToScene( this );

    this.state = SceneState.Start;
  }

  update( timeMs:DOMHighResTimeStamp ) {
  }

  render(renderer:three.Renderer) {
    // XXX: Find all entities with cameras and render to them
    this.camera.render( renderer, this._scene );
  }
}
