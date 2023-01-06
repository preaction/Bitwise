
import * as bitecs from 'bitecs';
import Component from '../Component.js';
import Entity from '../Entity.js';

export default class UI extends Component {
  static readonly MAX_PARENT_ID:number = 2**32-1;
  declare store:{
    pid: number[],
  };
  get componentData() {
    return {
      pid: bitecs.Types.eid,
    };
  }

  addEntity( eid:number ) {
    super.addEntity(eid);
    this.store.pid[eid] = UI.MAX_PARENT_ID;
  }

  freezeEntity( eid:number ) {
    const data = super.freezeEntity(eid);
    const entity = this.scene.entities[ eid ];
    data.path = entity.name;
    let parentId = this.store.pid[ entity.id ];
    while ( parentId < UI.MAX_PARENT_ID ) {
      const parent = this.scene.entities[ parentId ];
      data.path = [ parent.name, data.path ].join("/");
      parentId = this.store.pid[ parent.id ];
    }
    delete data.pid;
    entity.path = data.path;
    return data;
  }

  thawEntity( eid:number, data:{ [key:string]: any }={} ) {
    let pid = UI.MAX_PARENT_ID;
    if ( data.path && typeof data.path === "string" ) {
      const parts = data.path.split("/");
      parts.pop(); // Pop off the object's name
      if ( parts.length ) {
        const parentName = parts.pop();
        const parentPath = parts.join("/");
        var parent = Object.values( this.scene.entities ).find( (e:Entity) => ( !parentPath || e.path === parentPath ) && e.name === parentName );
        if ( parent ) {
          pid = parent.id;
        }
      }
    }
    data = { pid, ...data };
    delete data.path;
    super.thawEntity( eid, data );
  }
}
