
import Scene from './Scene.js';

/**
 * A Component is a set of data that can be attached to an {@link Entity}. Component
 * data is used by a {@link System} to provide behavior.
 *
 * A single Component instance stores data for all {@link Entity}
 * objects in a {@link Scene}. Data can be put in the {@link store} or
 * in custom attributes in the Component subclass.
 */
export default abstract class Component {
  world:any;

  /**
   * The store handles high-performance component data as an object of
   * pre-allocated, typed arrays. Data in the store can only be numeric
   * (integers or floats). The type of array to create is declared by
   * {@link componentData}.
   *
   * Component classes can also declare their own properties to store
   * arbitrary data like strings or objects.
   */
  store:{ [key:string]: Array<number> }
  scene:Scene;
  isNull:boolean = false;

  /**
   * Returns a mapping of property to data type. Data types are defined
   * by bitecs.Types.
   */
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
   * isHidden allows this component to be hidden from the editor. Hidden
   * components cannot be added in the editor and will not appear in the
   * editor if they are defined on the entity.
   */
  static isHidden:boolean = false;

  /**
   * Add an entity to this component. Override this method in a subclass
   * to set up default values for component properties.
   */
  addEntity( eid:number ) {
    this.scene.game.ecs.addComponent( this.world, this.store, eid );
  }

  /**
   * Remove an entity from this component.
   */
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

