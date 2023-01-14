
import * as bitecs from 'bitecs';
import Component from '../Component.js';

export default class UIImage extends Component {
  declare store:{
  };
  get componentData() {
    return {
    };
  }

  /**
   * The text for the given entity.
   */
  text: string[] = [];

  freezeEntity( eid:number ) {
    // Freeze always gives a texture path
    const data = super.freezeEntity(eid);
    data.text = this.text[eid];
    return data;
  }
  thawEntity( eid:number, data:{ [key:string]:any }={} ) {
    data = {...data};
    this.text[eid] = data?.text;
    delete data?.text;
    super.thawEntity( eid, data );
  }
}
