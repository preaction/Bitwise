
import * as bitecs from 'bitecs';
import Component from '../Component.js';

/**
 * Adds text to a {@link UIElement}.
 */
export default class UIText extends Component {
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
  align: string[] = [];

  freezeEntity( eid:number ) {
    // Freeze always gives a texture path
    const data = super.freezeEntity(eid);
    data.text = this.text[eid];
    data.align = this.align[eid];
    return data;
  }
  thawEntity( eid:number, data:{ [key:string]:any }={} ) {
    data = {...data};
    this.text[eid] = data?.text;
    delete data?.text;
    this.align[eid] = data?.align;
    delete data?.align;
    super.thawEntity( eid, data );
  }
}
