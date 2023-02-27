
import * as bitecs from 'bitecs';
import Component from '../Component.js';

/**
 * Adds a button to a {@link UIElement}.
 */
export default class UIButton extends Component {
  declare store:{
  };
  get componentData() {
    return {
    };
  }

  /**
   * The button action. Used by systems to add behaviors.
   */
  action: string[] = [];

  freezeEntity( eid:number ) {
    const data = super.freezeEntity(eid);
    data.action = this.action[eid];
    return data;
  }
  thawEntity( eid:number, data:{ [key:string]:any }={} ) {
    data = {...data};
    this.action[eid] = data?.action;
    delete data?.action;
    super.thawEntity( eid, data );
  }
}
