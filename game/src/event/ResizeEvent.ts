
import * as three from 'three';

/**
 * ResizeEvent is dispatched by Game when the canvas element is resized.
 */
export default interface ResizeEvent extends three.Event {
  width: number;
  height: number;
};
