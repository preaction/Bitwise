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

  // systems are added to the scene to make the game go.
  systems:any = {};

  // components are data added to entities
  components:any = {};

  // entities are the bitecs entities in this scene.
  // XXX: Store the entity name somewhere
  entities:any = {};
  eids:Number[] = [];

  constructor( game:Game ) {
    super();
    this.game = game;
    game.addEventListener( "resize", (e:Object) => this.dispatchEvent("resize", e) );

    this.world = bitecs.createWorld();
    this.systems = {};
    this.components = {};
  }

  // start() should initialize the scene and get it ready to be
  // rendered. When the scene is ready, it should set its state to
  // "Start".
  async start() {
    // XXX: Add entities to scene?

    this.state = SceneState.Start;
  }

  async pause() {
    this.state = SceneState.Pause;
  }

  async stop() {
    this.state = SceneState.Stop;
  }

  update( timeMs:DOMHighResTimeStamp ) {
    // XXX: Run through every system's update() method
    this.systems.Sprite.update( timeMs );
    this.systems.Render.update( timeMs );
  }

  render() {
    this.systems.Render.render();
  }

  freeze() {
    // XXX: Not using bitecs serialize/deserialize because I can't get
    // them to work...
    const data = [];
    for ( const id of this.eids ) {
      const entity = this.entities[id];
      const eData = {
        name: entity.name,
        type: entity.type,
      };
      for ( const c of entity.listComponents() ) {
        eData[c] = this.components[c].freezeEntity(id);
      }
      data.push( eData );
    }
    return { entities: data };
  }

  thaw( data:Object ) {
    console.log( "Thawing scene from", data );
    // XXX: Not using bitecs serialize/deserialize because I can't get
    // them to work...
    // Load the metadata first so that components have something to hook
    // on to.
    for ( const eData of data.entities ) {
      const entity = this.addEntity();
      entity.name = eData.name;
      entity.type = eData.type;
      entity.path = eData.path;
      eData.id = entity.id;
    }
    for ( const eData of data.entities ) {
      for ( const c in eData ) {
        if ( typeof eData[c] !== "object" ) {
          continue;
        }
        this.components[c].thawEntity(eData.id, eData[c]);
      }
    }
  }

  // XXX: Systems have an order
  addSystem( name:string, system:any ) {
    this.systems[name] = new system( this );
  }

  addComponent( name:string, component:any ) {
    console.log( `Adding component ${name}`, component );
    this.components[name] = new component( this, this.world );
  }

  addEntity() {
    const id = bitecs.addEntity( this.world );
    this.eids.push(id);
    this.entities[id] = new Entity(this, id);
    return this.entities[id];
  }

  removeEntity( id:Number ) {
    bitecs.removeEntity( this.world, id );
    delete this.entities[id];
    this.eids.splice( this.eids.indexOf(id), 1 );
  }
}
