
import * as bitecs from 'bitecs';
import Scene from './Scene.ts';

export default class Entity {
  id:Number;
  type:string = "Entity";
  name:string = "New Entity";
  path:string = "";
  scene:Scene;

  constructor(scene:Scene, id:Number) {
    this.scene = scene;
    this.id = id;
  }

  addComponent( name:string, data:Object ) {
    console.log( `Adding component ${name} to ${this.id}` );
    const component = this.scene.components[name];
    component.addEntity( this.id );
    this.setComponent(name, data);
  }

  setComponent( name:string, data:Object ) {
    const component = this.scene.components[name].store;
    for ( let key in data ) {
      component[key][this.id] = data[key];
    }
  }

  getComponent( name:string ):Object {
    const component = this.scene.components[name].store;
    const data = {};
    for ( let key in component ) {
      data[key] = component[key][this.id];
    }
    return data;
  }

  listComponents() {
    const names = [];
    COMPONENT:
    for ( const c of bitecs.getEntityComponents(this.scene.world, this.id) ) {
      for ( const name in this.scene.components ) {
        if ( this.scene.components[name].store === c ) {
          names.push(name);
          continue COMPONENT;
        }
      }
    }
    return names;
  }

  addEntity() {
    return this.scene.addEntity( this.id );
  }
}
