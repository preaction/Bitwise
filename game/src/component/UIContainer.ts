
import * as bitecs from 'bitecs';
import Component from '../Component.js';

/**
 * Declares a {@link UIElement} as a container and controls how to lay
 * out the element's children.
 */
export default class UIContainer extends Component {
  declare store: {
  };
  get componentData() {
    return {
    };
  }

  flow: string[] = [];
  justify: string[] = [];
  align: string[] = [];

  freezeEntity( eid:number ) {
    const data = super.freezeEntity(eid);
    data.flow = this.flow[eid];
    data.justify = this.justify[eid];
    data.align = this.align[eid];
    return data;
  }
  thawEntity( eid:number, data:{ [key:string]:any }={} ) {
    data = {...data};
    this.flow[eid] = data?.flow;
    delete data?.flow;
    this.justify[eid] = data?.justify;
    delete data?.justify;
    this.align[eid] = data?.align;
    delete data?.align;
    super.thawEntity( eid, data );
  }
}
