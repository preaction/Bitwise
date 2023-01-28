
import * as bitecs from 'bitecs';
import ActiveComponent from './component/Active.js';
import Scene from './Scene.js';

export default class Entity {
  id:number;
  type:string = "Entity";
  name:string = "New Entity";
  scene:Scene;

  /**
   * The active flag determines if the entity is added to the scene when
   * the scene starts. Otherwise, the entity is created but not added to
   * the scene.
   *
   * The active flag corresponds to the Active component. Systems can
   * honor the active flag by adding the Active component to queries.
   */
  get active():boolean {
    return bitecs.hasComponent( this.scene.world, this.id, this.scene.getComponent(ActiveComponent).store );
  }
  set active(newActive:boolean) {
    if ( newActive ) {
      bitecs.addComponent( this.scene.world, this.scene.getComponent(ActiveComponent).store, this.id )
    }
    else {
      bitecs.removeComponent(this.scene.world, this.scene.getComponent(ActiveComponent).store, this.id )
    }
  }

  constructor(scene:Scene, id:number) {
    this.scene = scene;
    this.id = id;
  }

  _path:string = "";
  /**
   * path is the full path to this entity.
   */
  get path():string {
    return this._path;
  }
  set path(newPath:string) {
    this._path = newPath;
    // Reset the parent cache
    this._parent = undefined;
  }

  _parent:Entity|undefined = undefined;
  /**
   * parent is the parent Entity, if any.
   */
  get parent():Entity|undefined {
    if ( !this._parent && this.path.match(/\//) ) {
      const parentPath = this.path.split('/').slice(0, -1).join('/');
      this._parent = this.scene.getEntityByPath(parentPath);
    }
    return this._parent;
  }
  set parent(newParent:Entity|undefined) {
    if ( newParent ) {
      this._path = newParent.path + '/' + this.name;
    }
    else {
      this._path = this.name;
    }
    this._parent = newParent;
  }

  addComponent( name:string, data:{ [key:string]: any } ) {
    if ( !this.scene.components[name] ) {
      this.scene.addComponent( name );
    }
    const component = this.scene.components[name];
    component.addEntity( this.id );
    this.setComponent(name, data);
  }

  setComponent( name:string, data:{ [key:string]: any } ) {
    return this.scene.components[name].thawEntity( this.id, data );
  }

  removeComponent( name:string ) {
    const component = this.scene.components[name];
    component.removeEntity( this.id );
  }

  getComponent( name:string ):{ [key:string]: any } {
    return this.scene.components[name].freezeEntity( this.id );
  }

  listComponents() {
    const names = [];
    COMPONENT:
    for ( const c of this.scene.game.ecs.getEntityComponents(this.scene.world, this.id) ) {
      for ( const name in this.scene.components ) {
        if ( this.scene.components[name].store === c ) {
          names.push(name);
          continue COMPONENT;
        }
      }
    }
    return names;
  }

  /**
   * Serialize this entity and all its descendants. The opposite of thaw().
   */
  freeze():any {
    const data:{[key:string]:any} = {
      name: this.name,
      type: this.type,
      path: this.path,
      active: this.active,
      components: {},
    };
    for ( const c of this.listComponents() ) {
      data.components[c] = this.scene.components[c].freezeEntity(this.id);
    }

    // Also freeze descendants
    data.entities = [];
    Object.values(this.scene.entities).filter( e => e.path.startsWith(this.path + '/' ) ).forEach( entity => {
      const eData:{[key:string]:any} = {
        name: entity.name,
        type: entity.type,
        path: entity.path,
        active: entity.active,
        components: {},
      };
      for ( const c of entity.listComponents() ) {
        eData.components[c] = entity.scene.components[c].freezeEntity(entity.id);
      }
      data.entities.push(eData);
    } );

    return data;
  }

  /**
   * Deserialize this entity and any descendants. The opposite of
   * freeze().
   */
  thaw( data:any ) {
    this.name = data.name;
    this.type = data.type;
    this.path = data.path;
    this.active = "active" in data ? data.active : true;
    for ( const c in data.components ) {
      if ( !this.scene.components[c] ) {
        this.scene.addComponent(c);
      }
      this.scene.components[c].thawEntity(this.id, data.components[c]);
    }
    // XXX: Remove any components from this entity which are not in the
    // given data

    if ( data.entities ) {
      for ( const eData of data.entities ) {
        // XXX: Find an entity already descended from this entity with the
        // same name. Use that instead of adding one, if found.
        const entity = this.scene.addEntity();
        entity.name = eData.name;
        entity.type = eData.type;
        entity.path = eData.path;
        entity.active = eData.active;
        eData.id = entity.id;
      }
      for ( const eData of data.entities ) {
        for ( const c in eData.components ) {
          if ( !this.scene.components[c] ) {
            this.scene.addComponent(c);
          }
          this.scene.components[c].thawEntity(eData.id, eData.components[c]);
        }
        // XXX: Remove any components from this entity which are not in the
        // given data
        delete eData.id;
      }
    }
    // XXX: Remove any descendant entities not found in data
  }
}
