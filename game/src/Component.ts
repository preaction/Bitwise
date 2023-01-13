
import Scene from './Scene.js';

export default abstract class Component {
  world:any;
  store:{ [key:string]: Array<number> }
  scene:Scene;
  isNull:boolean = false;
  get componentData():Object { return {} };

  constructor( scene:Scene, world:any ) {
    this.scene = scene;
    this.world = world;
    this.store = scene.game.ecs.defineComponent( this.componentData );
  }
  static get editorComponent():string {
    return '';
  }
  /**
   * isHidden allows this component to be hidden from the editor.
   */
  static isHidden:boolean = false;
  addEntity( eid:number ) {
    this.scene.game.ecs.addComponent( this.world, this.store, eid );
  }
  removeEntity( eid:number ) {
    this.scene.game.ecs.removeComponent( this.world, this.store, eid );
  }

  /**
   * thawEntity adds this component to the given entity and sets the
   * component data. It is the opposite of freezeEntity: The data object
   * returned by freezeEntity is the same one accepted by thawEntity.
   *
   * This method can be overridden for custom deserialization. For
   * example, the Sprite component thaws texture paths by using the Load
   * object to get a texture ID.
   */
  thawEntity( eid:number, data:{ [key:string]: any }={} ):void {
    this.addEntity( eid );
    for ( const k in data ) {
      this.store[k][eid] = data[k];
    }
  }

  /**
   * freezeEntity returns an object of component data for the given
   * entity. It is the opposite of thawEntity: The data object accepted
   * by thawEntity is the same one returned by freezeEntity.
   *
   * This method can be overridden for custom serialization. For
   * example, the Sprite component freezes texture IDs as the path to
   * the texture's image file.
   */
  freezeEntity( eid:number ):{ [key:string]: any } {
    const data: { [key:string]: any } = {};
    for ( const k in this.store ) {
      data[k] = this.store[k][eid];
    }
    return data;
  }
}

