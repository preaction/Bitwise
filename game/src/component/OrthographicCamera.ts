
import * as bitecs from 'bitecs';
import Component from '../Component.js';

/**
 * Defines an entity as an orthographic camera. For an orthographic
 * camera, objects do not change size based on their distance from the
 * camera lens. This effectively makes everything into flat,
 * two-dimensional objects.
 *
 * Orthographic cameras are used to make 2D games, or to make 2D
 * sections of the screen in 3D games (like a UI overlay).
 */
export default class OrthographicCamera extends Component {
  declare store: {
    frustum: number[],
    zoom: number[],
    near: number[],
    far: number[],
  }
  get componentData() {
    return {
      frustum: bitecs.Types.f32,
      zoom: bitecs.Types.f32,
      near: bitecs.Types.f32,
      far: bitecs.Types.f32,
    };
  }

  addEntity(eid: number) {
    super.addEntity(eid);
    this.store.frustum[eid] = 10;
    this.store.zoom[eid] = 1;
    this.store.near[eid] = 0;
    this.store.far[eid] = 2000;
  }
}
