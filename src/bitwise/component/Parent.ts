
import * as bitecs from 'bitecs';
import Component from '../Component.ts';

export default class Parent extends Component {
  get componentData() {
    return {
      id: bitecs.Types.eid,
    }
  }
  freezeEntity( eid:Number ) {
    const data = super.freezeEntity(eid);
    const entity = this.scene.entities[ eid ];
    var parent = this.scene.entities[ data.id ];
    data.path = parent.name;
    while ( parent.listComponents().includes( "Parent" ) ) {
      const parentId = this.store.id[ parent.id ];
      parent = this.scene.entities[ parentId ];
      data.path = [ parent.name, data.path ].join("/");
    }
    delete data.id;
    entity.path = data.path;
    return data;
  }
  thawEntity( eid:Number, data:Object ) {
    const parts = data.path.split("/");
    const name = parts.pop();
    const path = parts.join("/");
    var parent = Object.values( this.scene.entities ).find( e => ( !path || e.path === path ) && e.name === name );
    console.log( `Found parent ${data.path}:`, parent );
    const id = parent.id;
    super.thawEntity( eid, {id} );
  }
}
