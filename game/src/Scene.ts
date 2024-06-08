import * as three from 'three';
import * as bitecs from 'bitecs';
import Component from './Component.js';
import System from './System.js';
import NullSystem from './system/Null.js';
import NullComponent from './component/Null.js';
import Entity, { EntityData, NewEntityData } from './Entity.js';
import ProgressEvent from './event/ProgressEvent.js';

/**
 * SceneState is the current state of the scene.
 * @enum
 */
export enum SceneState {
  /**
   * Stop means the scene is not rendering or updating.
   */
  Stop = "STOP",
  /**
   * Start means the scene is getting ready to start. The scene will get
   * one call to render() at the next frame and then its state will be
   * set to Run.
   */
  Start = "START",
  /**
   * Run means the scene is getting update() and render() calls, in that
   * order.
   */
  Run = "RUN", // Scene is rendering and updating
  /**
   * Pause means the scene is getting render() calls, but not update()
   * calls.
   */
  Pause = "PAUSE",
}

export type SceneData = {
  $schema: string,
  name: string,
  entities: Array<EntityData>,
  components: string[],
  systems: any[],
};

export declare interface Scene {
  addEventListener(event: 'progress', listener: (e: ProgressEvent) => void): this;
  addEventListener(event: string, listener: Function): this;
  removeEventListener(event: 'progress', listener: (e: ProgressEvent) => void): this;
  removeEventListener(event: string, listener: Function): this;
}

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
export class Scene extends three.EventDispatcher {
  name: string = 'New Scene';
  game: any;
  state: SceneState = SceneState.Stop;
  _scene: three.Scene = new three.Scene();
  _uiScene: three.Scene = new three.Scene();

  // world is the bitecs World object. Each scene has its own.
  world: bitecs.IWorld;

  // systems are added to the scene to make the game go.
  systems: System[] = [];

  // components are data added to entities
  components: { [key: string]: Component } = {};

  // entities are the bitecs entities in this scene.
  entities: { [key: number]: Entity } = {};
  eids: number[] = [];

  /**
   */
  constructor(game: any) {
    super();
    this.game = game;
    game.addEventListener("resize", (e: { type: string, width: number, height: number }) => {
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
    for (const system of this.systems) {
      // XXX: init() should be async
      promises.push(system.init());
    }
    return Promise.all(promises);
  }

  /**
   * start() is the first step of scene runtime. This method should
   * enable the scene, start tracking input, and add objects to the
   * Render and Physics systems.
   */
  start() {
    if (this.state === SceneState.Start || this.state === SceneState.Run) {
      return;
    }
    else if (this.state !== SceneState.Stop) {
      throw `Cannot start scene in state ${this.state}`;
    }
    this.dispatchEvent({ type: 'start' });
    for (const system of this.systems) {
      system.start();
    }
    this.state = SceneState.Start;
  }

  pause() {
    if (this.state === SceneState.Pause) {
      return;
    }
    else if (this.state !== SceneState.Run) {
      throw `Cannot pause scene in state ${this.state}`;
    }
    this.dispatchEvent({ type: 'pause' });
    for (const system of this.systems) {
      system.pause();
    }
    this.state = SceneState.Pause;
  }

  resume() {
    if (this.state === SceneState.Run) {
      return;
    }
    else if (this.state !== SceneState.Pause) {
      throw `Cannot resume scene in state ${this.state}`;
    }
    this.dispatchEvent({ type: 'resume' });
    for (const system of this.systems) {
      system.resume();
    }
    this.state = SceneState.Run;
  }

  stop() {
    if (this.state === SceneState.Stop) {
      return;
    }
    this.dispatchEvent({ type: 'stop' });
    for (const system of this.systems) {
      system.stop();
    }
    this.state = SceneState.Stop;
  }

  update(timeMs: DOMHighResTimeStamp) {
    this.dispatchEvent({ type: 'beforeUpdate' });
    for (const system of this.systems) {
      // XXX: Create inlined version of this function with only those
      // systems that have update methods
      if (system.update) {
        system.update(timeMs);
      }
    }
    this.dispatchEvent({ type: 'afterUpdate' });
  }

  render() {
    this.dispatchEvent({ type: 'beforeRender' });
    for (const system of this.systems) {
      // XXX: Create inlined version of this function with only those
      // systems that have render methods
      if (system.render) {
        system.render();
      }
    }
    this.dispatchEvent({ type: 'afterRender' });
  }

  getSystem<T extends System>(sysType: (new (...args: any[]) => T)): T {
    for (const sys of this.systems) {
      if (sys instanceof sysType) {
        return sys as T;
      }
    }
    throw `System ${sysType.name} is required`;
  }

  /**
   * Get the component with the given class constructor. Will create a new
   * component instance if necessary.
   *
   * @param componentType The component class / constructor
   * @throws string If the component constructor cannot be found in the registry
   * @returns T An object of the given class
   */
  getComponent<T extends Component>(componentType: (new (...args: any[]) => T)): T {
    for (const comp of Object.values(this.components)) {
      if (comp.constructor === componentType) {
        return comp as T;
      }
    }
    // Otherwise, try to load it using the name from the Game class
    // XXX: Why do we need to look up the name like this if we already
    // have the constructor?
    for (const componentName in this.game.components) {
      if (this.game.components[componentName] === componentType) {
        return this.addComponent(componentName);
      }
    }
    throw `Component ${componentType.name} not found in Game`;
  }

  getEntityById(eid: number): Entity {
    return this.entities[eid];
  }

  getEntityByPath(path: string): Entity | undefined {
    return Object.values(this.entities).find(e => e.path === path);
  }

  /**
   * Serialize the scene data into a form that can be stored. The
   * opposite of thaw()
   */
  freeze(): SceneData {
    const seenComponents = new Set<string>();
    const rootEntities = {} as { [key: string]: EntityData };
    // Sort entities by path so we always get parents before children
    const entities = this.eids.map(eid => this.entities[eid]).sort((a, b) => a.path > b.path ? 1 : a.path < b.path ? -1 : 0)
    for (const entity of entities) {
      const eData: EntityData = {
        $schema: "1",
        name: entity.name,
        type: entity.type,
        active: entity.active,
        children: [],
      };
      eData.components = {};
      for (const c of entity.listComponents()) {
        seenComponents.add(c);
        eData.components[c] = this.components[c].freezeEntity(entity.id);
      }

      const parts = entity.path.split('/');
      if (parts.length == 1) {
        rootEntities[parts[0]] = eData;
      }
      else {
        let parent = rootEntities[parts[0]];
        parts.shift()
        for (const part of parts) {
          parent.children ??= []
          const newParent = parent.children.find(p => p.name === part)
          if (newParent) {
            parent = newParent;
          }
        }
        parent.children ??= []
        parent.children.push(eData);
      }
    }

    return {
      $schema: "1",
      name: this.name,
      entities: Object.values(rootEntities),
      components: Array.from(seenComponents),
      systems: this.systems.map(s => ({ name: s.name, data: s.freeze() })),
    };
  }

  /**
   * Load the scene from the given data. The opposite of freeze().
   */
  async thaw(data: SceneData) {
    const promises: Promise<any>[] = [];

    this.name = data.name;
    for (const name of data.components) {
      this.addComponent(name);
    }
    for (const system of data.systems) {
      this.addSystem(system.name, system.data);
    }

    return Promise.all(data.entities.map(e => this.addEntity().thaw(e)));
  }

  addSystem(name: string, data: any = {}) {
    let cons = this.game.systems[name];
    if (!cons) {
      cons = NullSystem;
    }
    const system = new cons(name, this);
    system.thaw(data);
    this.systems.push(system);
    system.addEventListener('progress', (progress: ProgressEvent) => this.addProgress(name, progress));
  }

  private systemProgress: { [key: string]: ProgressEvent } = {};
  protected addProgress(name: string, progress: ProgressEvent) {
    this.systemProgress[name] = progress;
    const sceneProgress = new ProgressEvent();
    Object.values(this.systemProgress).forEach(
      p => {
        sceneProgress.loaded += p.loaded;
        sceneProgress.total += p.total;
      }
    );
    this.dispatchEvent(sceneProgress);
  }

  /**
   * Add a component to the scene. Creates an instance of the component
   * class registered with the Game.registerComponent() method.
   *
   * @param name The name of a component registered with the Game object
   * @returns The newly-created component
   */
  addComponent<T extends Component>(name: string): T {
    if (!this.components[name]) {
      let cons = this.game.components[name];
      if (!cons) {
        cons = NullComponent;
      }
      this.components[name] = new cons(this, this.world);
    }
    return this.components[name] as T;
  }

  addEntity(data: NewEntityData | null = null) {
    const id = this.game.ecs.addEntity(this.world);
    this.eids.push(id);
    this.entities[id] = new Entity(this, id);
    if (data !== null) {
      this.entities[id].thaw(data);
    }
    return this.entities[id];
  }

  /**
   * Remove an entity from the scene.
   * @param id The entity ID
   */
  removeEntity(id: number) {
    this.game.ecs.removeEntity(this.world, id);
    delete this.entities[id];
    this.eids.splice(this.eids.indexOf(id), 1);
  }
}

export default Scene;
