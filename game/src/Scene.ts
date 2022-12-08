/**
 * Scene is the top level of Three.JS Object3D. It also contains
 * a BitECS World, contains the Entities, and holds on to the BitECS
 * systems.
 *
 * Scene Systems are re-usable components for Scenes. A Physics System
 * may have corresponding Physics components on Entities.
 *
 * Scene lifecycle:
 *
 *  thaw   - First, a scene's data is thawed. This loads the entity data
 *           and attaches Systems and Components.
 *  init   - Next, init() is called on all Systems. This lets Systems
 *           load anything necessary.
 *  load   - After init, the loader is invoked to load any pending
 *           assets from thaw or init.
 *  start  - This starts the scene. start() is called on all Systems,
 *           and the scene begins recieving update() calls.
 *  stop   - This stops the scene.
 */
import * as three from 'three';
import * as bitecs from 'bitecs';
import Component from './Component.js';
import System from './System.js';
import NullSystem from './system/Null.js';
import NullComponent from './component/Null.js';
import Entity from './Entity.js';
import Position from './component/Position';

// SceneState is the current state of the scene.
export enum SceneState {
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

type SceneData = {
  name: string,
  entities: Array<{[key:string]:any}>,
  components: string[],
  systems: any[],
};

export default class Scene extends three.EventDispatcher {
  name:string = 'New Scene';
  game:any;
  state:SceneState = SceneState.Stop;
  _scene:three.Scene = new three.Scene();

  // world is the bitecs World object. Each scene has its own.
  world:bitecs.IWorld;

  // systems are added to the scene to make the game go.
  systems:System[] = [];

  // components are data added to entities
  components:{ [key:string]: Component } = {};

  // entities are the bitecs entities in this scene.
  entities:{ [key:number]: Entity } = {};
  eids:number[] = [];

  constructor( game:any ) {
    super();
    this.game = game;
    game.addEventListener( "resize", (e:{type: string, width: number, height: number}) => {
      this.dispatchEvent(e);
    });

    this.world = game.ecs.createWorld();
    this.systems = [];
    this.components = {};
  }

  /**
   * init() is the final step of scene setup, after contruction and
   * thaw(). At this point, Systems can assume all entities' data is
   * loaded. This method should load external assets into memory and
   * pre-allocate needed objects.
   */
  async init() {
    const promises = [];
    this.dispatchEvent({ type: 'init' });
    for ( const system of this.systems ) {
      // XXX: init() should be async
      promises.push( system.init() );
    }
    return Promise.all( promises );
  }

  /**
   * start() is the first step of scene runtime. This method should
   * enable the scene, start tracking input, and add objects to the
   * Render and Physics systems.
   */
  start() {
    this.dispatchEvent({ type: 'start' });
    for ( const system of this.systems ) {
      system.start();
    }
    this.state = SceneState.Start;
  }

  pause() {
    this.dispatchEvent({ type: 'pause' });
    for ( const system of this.systems ) {
      system.pause();
    }
    this.state = SceneState.Pause;
  }

  resume() {
    this.dispatchEvent({ type: 'resume' });
    for ( const system of this.systems ) {
      system.resume();
    }
    this.state = SceneState.Run;
  }

  stop() {
    this.dispatchEvent({ type: 'stop' });
    for ( const system of this.systems ) {
      system.stop();
    }
    this.state = SceneState.Stop;
  }

  update( timeMs:DOMHighResTimeStamp ) {
    this.dispatchEvent({ type: 'beforeUpdate' });
    for ( const system of this.systems ) {
      // XXX: Create inlined version of this function with only those
      // systems that have update methods
      if ( system.update ) {
        system.update( timeMs );
      }
    }
    this.dispatchEvent({ type: 'afterUpdate' });
  }

  render() {
    this.dispatchEvent({ type: 'beforeRender' });
    for ( const system of this.systems ) {
      // XXX: Create inlined version of this function with only those
      // systems that have render methods
      if ( system.render ) {
        system.render();
      }
    }
    this.dispatchEvent({ type: 'afterRender' });
  }

  getSystem<T extends System>(sysType:(new (...args: any[]) => T)):T {
    for ( const sys of this.systems ) {
      if ( sys.constructor === sysType ) {
        return sys as T;
      }
    }
    throw `System ${sysType.name} is required`;
  }

  getComponent<T extends Component>(compType:(new (...args: any[]) => T)):T {
    for ( const comp of Object.values(this.components) ) {
      if ( comp.constructor === compType ) {
        return comp as T;
      }
    }
    throw `Component ${compType} is required`;
  }

  getEntityById( eid:number ):Entity {
    return this.entities[ eid ];
  }

  getEntityByPath( path:string ):Entity|null {
    // XXX: Might want to keep a cache of entity by path
    const parts = path.split( /\// );
    const position = this.getComponent( Position );
    let pid = Position.MAX_PARENT_ID;
    let findName = '';
    let entity = null;
    while ( parts.length > 0 ) {
      findName = parts.shift() || '';
      entity = Object.values( this.entities ).find( e => {
        return position.store.pid[ e.id ] === pid && e.name === findName;
      });
      if ( !entity ) {
        return null;
      }
      pid = entity.id;
    }
    return entity;
  }

  freeze():SceneData {
    // XXX: Not using bitecs serialize/deserialize because I can't get
    // them to work...
    const seenComponents = new Set<string>();
    const data = [];
    for ( const id of this.eids ) {
      const entity = this.entities[id];
      const eData:{ [key:string]: any } = {
        name: entity.name,
        type: entity.type,
      };
      for ( const c of entity.listComponents() ) {
        seenComponents.add(c);
        eData[c] = this.components[c].freezeEntity(id);
      }
      data.push( eData );
    }

    return {
      name: this.name,
      entities: data,
      components: Array.from(seenComponents),
      systems: this.systems.map( s => ({ name: s.name, data: s.freeze() }) ),
    };
  }

  thaw( data:SceneData ) {
    this.name = data.name;
    for ( const name of data.components ) {
      this.addComponent( name );
    }
    for ( const system of data.systems ) {
      this.addSystem( system.name, system.data );
    }

    // Load the entity metadata first so that components have something
    // to hook on to.
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

  addSystem( name:string, data:any={} ) {
    let cons = this.game.systems[ name ];
    if ( !cons ) {
      console.log( `Could not find system ${name}` );
      cons = NullSystem;
    }
    const system = new cons( name, this );
    system.thaw( data );
    this.systems.push(system);
  }

  addComponent( name:string ) {
    let cons = this.game.components[ name ];
    if ( !cons ) {
      console.log( `Could not find component ${name}` );
      cons = NullComponent;
    }
    this.components[name] = new cons( this, this.world );
  }

  addEntity() {
    const id = this.game.ecs.addEntity( this.world );
    this.eids.push(id);
    this.entities[id] = new Entity(this, id);
    return this.entities[id];
  }

  removeEntity( id:number ) {
    this.game.ecs.removeEntity( this.world, id );
    delete this.entities[id];
    this.eids.splice( this.eids.indexOf(id), 1 );
  }
}
