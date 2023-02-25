/**
 * A ProgressEvent measures the progress of some operation. These events
 * are dispatched by Systems and aggregated by Scenes to create loading
 * screens.
 */
export default class ProgressEvent {
  /**
   * The amount of things that have been loaded.
   */
  loaded: number = 0;
  /**
   * The total amount of things that will be loaded.
   */
  total: number = 0;
  /**
   * The event type: "progress"
   */
  readonly type: string = 'progress';

  constructor( loaded:number = 0, total:number = 0 ) {
    this.loaded = loaded;
    this.total = total;
  }
}
