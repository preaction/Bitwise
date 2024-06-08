
import * as bitecs from 'bitecs';
import ActiveComponent from './component/Active.js';
import Scene from './Scene.js';
import Active from './component/Active.js';

export type EntityData = {
  $schema: string,
  name: string,
  type?: string,
  active: boolean,
  components?: {
    [key: string]: any,
  },
  children?: Array<EntityData>,
};

export type NewEntityData = Partial<EntityData> & { name: EntityData['name'] }

/**
 * Entity is a single "thing" in a {@link Scene}. Entity objects are
 * mainly an ID used to look up data in a {@link Component}. Entities
 * can be attached to {@link Component}s, which are then used by {@link
 * System} classes to provide some behavior (render a sprite, provide
 * physics, etc...)
 */
export default class Entity {
  id: number;
  type: string = "Entity";
  scene: Scene;

  get name(): string {
    return this._path.split('/').slice(-1)[0];
  }
  set name(newName: string) {
    this._path = [...this._path.split('/').slice(0, -1), newName].join('/');
  }

  /**
   * The active flag determines if the entity is added to the scene when
   * the scene starts. Otherwise, the entity is created but not added to
   * the scene.
   *
   * The active flag corresponds to the Active component. Systems can
   * honor the active flag by adding the Active component to queries.
   */
  get active(): boolean {
    return bitecs.hasComponent(this.scene.world, this.scene.getComponent(ActiveComponent).store, this.id);
  }
  set active(newActive: boolean) {
    if (newActive) {
      bitecs.addComponent(this.scene.world, this.scene.getComponent(ActiveComponent).store, this.id)
    }
    else {
      bitecs.removeComponent(this.scene.world, this.scene.getComponent(ActiveComponent).store, this.id)
    }
  }

  /**
   */
  constructor(scene: Scene, id: number) {
    this.scene = scene;
    this.id = id;
  }

  _path: string = "New Entity";
  /**
   * path is the full path to this entity.
   *
   * Warning: Changing the path while the entity is active will not
   * change the entity's parent in the Render system! Do not change the
   * path after an entity is activated.
   */
  get path(): string {
    return this._path;
  }
  set path(newPath: string) {
    if (!newPath) {
      throw "Entity.path must be non-empty string";
    }
    // XXX: This should fire an event so things that depend on the
    // hierarchy can update themselves
    this._path = newPath;
    // Reset the parent cache
    this._parent = undefined;
  }

  _parent: Entity | undefined = undefined;
  /**
   * parent is the parent Entity, if any.
   */
  get parent(): Entity | undefined {
    if (!this._parent && this.path.match(/\//)) {
      const parentPath = this.path.split('/').slice(0, -1).join('/');
      this._parent = this.scene.getEntityByPath(parentPath);
    }
    return this._parent;
  }
  set parent(newParent: Entity | undefined) {
    if (newParent) {
      this._path = newParent.path + '/' + this.name;
    }
    else {
      this._path = this.name;
    }
    this._parent = newParent;
  }

  children: Entity[] = [];

  /**
   * Remove the entity from the scene.
   */
  remove(): void {
    this.scene.removeEntity(this.id);
  }

  async addComponent(name: string, data: { [key: string]: any }) {
    if (!this.scene.components[name]) {
      this.scene.addComponent(name);
    }
    const component = this.scene.components[name];
    component.addEntity(this.id);
    return this.setComponent(name, data);
  }

  async setComponent(name: string, data: { [key: string]: any }) {
    return this.scene.components[name].thawEntity(this.id, data);
  }

  removeComponent(name: string) {
    const component = this.scene.components[name];
    component.removeEntity(this.id);
  }

  getComponent(name: string): { [key: string]: any } {
    return this.scene.components[name].freezeEntity(this.id);
  }

  listComponents() {
    const names = [];
    COMPONENT:
    for (const c of this.scene.game.ecs.getEntityComponents(this.scene.world, this.id)) {
      for (const name in this.scene.components) {
        if (this.scene.components[name].store === c) {
          names.push(name);
          continue COMPONENT;
        }
      }
    }
    return names;
  }

  /**
   * Add a child entity to this entity.
   */
  addEntity(data: NewEntityData | null = null): Entity {
    const entity = this.scene.addEntity(data);
    entity.parent = this;
    this.children.push(entity);
    return entity;
  }

  /**
   * Serialize this entity and all its descendants. The opposite of thaw().
   */
  freeze(): EntityData {
    const data: EntityData = {
      $schema: '1',
      name: this.name,
      type: this.type,
      active: this.active,
    };
    data.components = {};
    for (const c of this.listComponents()) {
      data.components[c] = this.scene.components[c].freezeEntity(this.id);
    }
    data.children = this.children.map(e => e.freeze())
    return data;
  }

  /**
   * Deserialize this entity and any descendants. The opposite of
   * freeze().
   */
  async thaw(data: NewEntityData) {
    const promises: Promise<any>[] = [];

    if ("name" in data) {
      this.name = data.name;
    }
    if ("type" in data && data.type) {
      this.type = data.type;
    }
    this.active = "active" in data && typeof data.active !== 'undefined' ? data.active : true;
    for (const c in data.components) {
      if (!this.scene.components[c]) {
        this.scene.addComponent(c);
      }
      promises.push(this.scene.components[c].thawEntity(this.id, data.components[c]));
    }
    // XXX: Remove any components from this entity which are not in the
    // given data

    if (data.children) {
      for (const eData of data.children) {
        // XXX: Find an entity already descended from this entity with the
        // same name. Use that instead of adding one, if found.
        const entity = this.scene.addEntity();
        promises.push(entity.thaw(eData));
        this.children.push(entity);
      }
    }
    // XXX: Remove any descendant entities not found in data
    return Promise.all(promises);
  }
}
