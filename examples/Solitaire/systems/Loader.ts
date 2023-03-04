
import { Entity, Scene, System } from '@fourstar/bitwise';
import {UIElement} from '@fourstar/bitwise/component';
import {ProgressEvent} from '@fourstar/bitwise/event';

export default class Loader extends System {

  sceneLoaded:boolean = false;
  loadScenePath:string = '';
  loadScene?:Scene;
  progressEntityPath:string = '';
  progressEntity?:Entity;
  progress?:ProgressEvent;
  _progressHandler?:(e:ProgressEvent)=>void;
  UIElement!:UIElement;

  freeze() {
    const data = super.freeze();
    data.loadScenePath = this.loadScenePath;
    data.progressEntityPath = this.progressEntityPath;
    return data;
  }

  thaw( data:any ) {
    super.thaw(data);
    this.loadScenePath = data.loadScenePath;
    this.progressEntityPath = data.progressEntityPath;
  }

  async init() {
    this.UIElement = this.scene.getComponent(UIElement);
    if ( this.loadScenePath ) {
      this.loadScene = await this.scene.game.loadScene( this.loadScenePath );
    }
    if ( this.progressEntityPath ) {
      this.progressEntity = this.scene.getEntityByPath( this.progressEntityPath );
    }
  }

  onProgress(event:ProgressEvent) {
    this.progress = event;
  }

  start() {
    if ( !this.loadScene ) {
      return;
    }
    // Set up load event handler
    this._progressHandler = this.onProgress.bind(this);
    this.loadScene.addEventListener("progress", this._progressHandler)
    // Start loading the scene
    this.loadScene.init().then( () => this.sceneLoaded = true )
  }

  stop() {
    // Remove load event handler
    if ( this.loadScene && this._progressHandler ) {
      this.loadScene.removeEventListener("progress", this._progressHandler)
    }
  }

  update( timeMilli:number ) {
    // Perform updates
    if ( this.progressEntity && this.progress ) {
      this.UIElement.width[this.progressEntity.id] = `${this.progress.loaded * 100 / this.progress.total}%`;
    }
    if ( this.loadScene && this.sceneLoaded ) {
      console.log( `Transitioning to scene ${this.loadScenePath}` );
      this.loadScene.start();
      this.scene.stop();
    }
  }

  static get editorComponent():string {
    // Path to the .vue component, if any
    return 'systems/Loader.vue';
  }
}
