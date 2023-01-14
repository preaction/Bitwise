
import * as bitecs from 'bitecs';
import Component from '../Component.js';

export default class UIElement extends Component {
  declare store:{
    backgroundColor: number[],
  };
  width: string[] = [];
  height: string[] = [];
  borderStyle: string[] = [];
  borderWidth: string[] = [];
  borderColor: string[] = [];
  borderRadius: string[] = [];
  margin: string[] = [];
  padding: string[] = [];
  get componentData() {
    return {
      backgroundColor: bitecs.Types.ui32,
    };
  }
  freezeEntity(eid: number): {[key: string]: any;} {
    const data = super.freezeEntity(eid);
    data.backgroundColor = '#' + data.backgroundColor.toString(16).padStart(8, '0');
    data.width = this.width[eid];
    data.height = this.height[eid];
    data.borderStyle = this.borderStyle[eid];
    data.borderWidth = this.borderWidth[eid];
    data.borderColor = this.borderColor[eid];
    data.borderRadius = this.borderRadius[eid];
    data.margin = this.margin[eid];
    data.padding = this.padding[eid];
    return data;
  }
  thawEntity(eid: number, data?: {[key: string]: any;}): void {
    data = {...data};
    if ( data?.backgroundColor?.startsWith('#') ) {
      data.backgroundColor = parseInt( data.backgroundColor.slice(1), 16 );
    }
    this.width[eid] = data?.width;
    delete data?.width;
    this.height[eid] = data?.height;
    delete data?.height;
    this.borderStyle[eid] = data?.borderStyle;
    delete data?.borderStyle;
    this.borderWidth[eid] = data?.borderWidth;
    delete data?.borderWidth;
    this.borderColor[eid] = data?.borderColor;
    delete data?.borderColor;
    this.borderRadius[eid] = data?.borderRadius;
    delete data?.borderRadius;
    this.margin[eid] = data?.margin;
    delete data?.margin;
    this.padding[eid] = data?.padding;
    delete data?.padding;
    return super.thawEntity(eid, data);
  }
}
