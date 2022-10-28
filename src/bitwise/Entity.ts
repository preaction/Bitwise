
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
    const position = this.scene.getComponent(Position).store;
    const childIds:number[] = [];
    position.pid.forEach(
      (pid, eid) => {
        if ( pid === this.id ) {
          childIds.push(eid)
        }
      },
    );
    data.children = childIds.map( cid => this.scene.entities[cid].freeze() );
    return data
  }
}
