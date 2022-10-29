
import Scene from './Scene.js';
import Position from './component/Position.js';

export default class Entity {
  id:number;
  type:string = "Entity";
  name:string = "New Entity";
  path:string = "";
  scene:Scene;

  constructor(scene:Scene, id:number) {
    this.scene = scene;
    this.id = id;
  }

  addComponent( name:string, data:{ [key:string]: number } ) {
    if ( !this.scene.components[name] ) {
      this.scene.addComponent( name );
    }
    console.log( `Adding component ${name} to ${this.id}` );
    const component = this.scene.components[name];
    component.addEntity( this.id );
    this.setComponent(name, data);
  }

  setComponent( name:string, data:{ [key:string]: number } ) {
    const component = this.scene.components[name].store;
    for ( let key in data ) {
      console.log( `Setting ${name} ${key} to ${data[key]}` );
      component[key][this.id] = data[key];
    }
  }

  removeComponent( name:string ) {
    const component = this.scene.components[name];
    component.removeEntity( this.id );
  }

  getComponent( name:string ):{ [key:string]: number } {
    const component = this.scene.components[name].store;
    const data:{ [key:string]: number } = {};
    for ( let key in component ) {
      data[key] = component[key][this.id];
    }
    return data;
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

  freeze():any {
    const data:{[key:string]:any} = {
      name: this.name,
      type: this.type,
    };
    for ( const c of this.listComponents() ) {
      data[c] = this.scene.components[c].freezeEntity(this.id);
    }

    // Also freeze descendants
    const parentChildren:{ [key:number]: Set<number> } = {};
    const pos = this.scene.getComponent(Position).store;
    for ( const eid of this.scene.eids ) {
      const pid = pos.pid[eid];
      if ( !parentChildren[pid] ) {
        parentChildren[pid] = new Set([eid]);
      }
      else {
        parentChildren[pid].add(eid);
      }
    }
    const descendantIds:Set<number> = parentChildren[this.id];
    if ( descendantIds ) {
      for ( const pid of descendantIds ) {
        const children = parentChildren[pid];
        if ( children ) {
          for ( const cid of children ) {
            descendantIds.add(cid);
          }
        }
      }
      data.entities = [];
      descendantIds.forEach( id => {
        const entity = this.scene.entities[id];
        const eData:{[key:string]:any} = {
          name: entity.name,
          type: entity.type,
        };
        for ( const c of entity.listComponents() ) {
          eData[c] = entity.scene.components[c].freezeEntity(entity.id);
        }
        data.entities.push(eData);
      } );
    }
    console.log( 'Frozen entity:', data );

    return data;
  }

  thaw( data:any ) {
    this.name = data.name;
    this.type = data.type;
    data.id = this.id;
    for ( const c in data ) {
      if ( typeof data[c] !== "object" || Array.isArray(data[c]) ) {
        continue;
      }
      if ( !this.scene.components[c] ) {
        this.scene.addComponent(c);
      }
      this.scene.components[c].thawEntity(data.id, data[c]);
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
        eData.id = entity.id;
      }
      for ( const eData of data.entities ) {
        for ( const c in eData ) {
          if ( typeof eData[c] !== "object" ) {
            continue;
          }
          if ( !this.scene.components[c] ) {
            this.scene.addComponent(c);
          }
          this.scene.components[c].thawEntity(eData.id, eData[c]);
        }
        // XXX: Remove any components from this entity which are not in the
        // given data
      }
    }
  }
}
