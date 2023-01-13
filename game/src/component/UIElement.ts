
import * as bitecs from 'bitecs';
import Component from '../Component.js';

export default class UI extends Component {
  declare store:{
    backgroundColor: number[],
  };
  get componentData() {
    return {
      backgroundColor: bitecs.Types.ui32,
    };
  }
  freezeEntity(eid: number): {[key: string]: any;} {
    const data = super.freezeEntity(eid);
    data.backgroundColor = '#' + data.backgroundColor.toString(16).padStart(8, '0');
    return data;
  }
  thawEntity(eid: number, data?: {[key: string]: any;}): void {
    if ( data?.backgroundColor.startsWith('#') ) {
      data.backgroundColor = parseInt( data.backgroundColor.slice(1), 16 );
    }
    return super.thawEntity(eid, data);
  }
}
