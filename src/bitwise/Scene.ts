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
import * as bitecs from 'bitecs';
import Game from './Game.ts';
import Entity from './Entity.ts';
import OrthographicCamera from './system/OrthographicCamera.ts';
import Position from './system/Position.ts';
import Parent from './system/Parent.ts';
import Sprite from './system/Sprite.ts';

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

  // world is the bitecs World object. Each scene has its own.
  world:any;
  // systems are the components available. This may need to be moved
  // to the Game class, or the Game class be involved in defining which
  // systems are available.
  systems:any;
  components:any;
  // entities are the bitecs entities in this scene.
  // XXX: Store the entity name somewhere
  entities:Number[];

  cameraQuery:any;

  serializer:any;
  deserializer:any;

  constructor( game:Game ) {
    super();
    this.game = game;
    game.addEventListener( "resize", (e:Object) => this.dispatchEvent("resize", e) );

    this.world = bitecs.createWorld();
    this.systems = {};
    this.components = {};
    this.addSystem( "Parent", Parent );
    this.addSystem( "Position", Position );
    this.addSystem( "OrthographicCamera", OrthographicCamera );
    this.addSystem( "Sprite", Sprite );

    this.cameraQuery = bitecs.defineQuery([ this.components.OrthographicCamera ]);
    this.parentQuery = bitecs.defineQuery([ this.components.Parent ]);
    this.rootQuery = bitecs.defineQuery([ bitecs.Not(this.components.Parent) ]);
  }

  // start() should initialize the scene and get it ready to be
  // rendered. When the scene is ready, it should set its state to
  // "Start".
  async start() {
    // XXX: Add entities to scene?

    this.state = SceneState.Start;
  }

  update( timeMs:DOMHighResTimeStamp ) {
    // XXX: Run through every system's update() method
    this.systems.OrthographicCamera.update( timeMs );
    this.systems.Sprite.update( timeMs );
  }

  render(renderer:three.Renderer) {
    this.systems.OrthographicCamera.render( renderer );
  }

  serialize() {
    // XXX: Not using bitecs serialize/deserialize because I can't get
    // them to work...
    const data = [];
    for ( const id of this.listEntities() ) {
      const entity = new Entity( this, id );
      const eData = {};
      // XXX: Store the entity name somewhere
      data.push( eData );
      for ( const c of entity.listComponents() ) {
        eData[c] = entity.getComponent(c);
      }
    }
    return data;
  }

  deserialize( data:Object[] ) {
    // XXX: Not using bitecs serialize/deserialize because I can't get
    // them to work...
    for ( const eData of data ) {
      const entity = this.addEntity();
      // XXX: Store the entity name somewhere
      for ( const c in eData ) {
        entity.addComponent( c, eData[c] );
      }
    }
  }

  addSystem( name:string, system:any ) {
    this.systems[name] = new system( this );
    this.components[name] = this.systems[name].component;
  }

  addEntity( parent:Number=-1 ) {
    const id = bitecs.addEntity( this.world );
    if ( parent >= 0 ) {
      const component = this.components.Parent;
      bitecs.addComponent( this.world, component, id );
      component.id[id] = parent;
    }
    return new Entity(this, id);
  }

  listEntities() {
    return this.parentQuery( this.world ).concat( this.rootQuery( this.world ) );
  }
}
