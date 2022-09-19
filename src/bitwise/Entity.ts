
import * as bitecs from 'bitecs';
import Scene from './Scene.ts';

export default class Entity {
  id:Number;
  scene:Scene;

  constructor(scene:Scene, id:Number) {
    this.scene = scene;
    this.id = id;
  }

  addComponent( name:string, data:Object ) {
    const component = this.scene.systems[name].component;
    bitecs.addComponent(this.scene.world, component, this.id);
    this.setComponent(name, data);
  }

  setComponent( name:string, data:Object ) {
    const component = this.scene.systems[name].component;
    for ( let key in data ) {
      component[key][this.id] = data[key];
    }
  }

  getComponent( name:string ):Object {
    const component = this.scene.systems[name].component;
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
        if ( this.scene.components[name] === c ) {
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
