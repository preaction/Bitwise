
import * as bitecs from 'bitecs';
import Component from '../Component.js';
import Entity from '../Entity.js';

export default class Position extends Component {
  declare store:{
    x: number[],
    y: number[],
    z: number[],
    rx: number[],
    ry: number[],
    rz: number[],
    rw: number[],
    sx: number[],
    sy: number[],
    sz: number[],
    pid: number[],
  }

  get componentData() {
    return {
      x: bitecs.Types.f32,
      y: bitecs.Types.f32,
      z: bitecs.Types.f32,
      rx: bitecs.Types.f32,
      ry: bitecs.Types.f32,
      rz: bitecs.Types.f32,
      rw: bitecs.Types.f32,
      sx: bitecs.Types.f32,
      sy: bitecs.Types.f32,
      sz: bitecs.Types.f32,
      pid: bitecs.Types.eid,
    }
  }

  addEntity( eid:number ) {
    super.addEntity(eid);
    this.store.sx[eid] = 1;
    this.store.sy[eid] = 1;
    this.store.sz[eid] = 1;
    this.store.pid[eid] = 2**32-1;
  }

  freezeEntity( eid:number ) {
    const data = super.freezeEntity(eid);
    const entity = this.scene.entities[ eid ];
    data.path = entity.name;
    let parentId = this.store.pid[ entity.id ];
    while ( parentId < 2**32-1 ) {
      const parent = this.scene.entities[ parentId ];
      data.path = [ parent.name, data.path ].join("/");
      parentId = parent.id;
    }
    delete data.pid;
    entity.path = data.path;
    return data;
  }

  thawEntity( eid:number, data:{ [key:string]: any } ) {
    let pid = 2**32-1;
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
