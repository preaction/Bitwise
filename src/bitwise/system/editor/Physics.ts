
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from '../../Scene.js';
import System from '../../System.js';
import Component from '../../Component.js';
import Position from '../../component/Position.js';
import RigidBody from '../../component/RigidBody.js';

// XXX: This should subclass the standard Physics system?
export default class Physics extends System {
  rigidbody:RigidBody;
  position:Position;
  collider:{ box: Component };

  bodies:Array<any> = [];

  query:bitecs.Query;
  enterQuery:bitecs.Query;
  exitQuery:bitecs.Query;

  constructor( name:string, scene:Scene, data:any ) {
    super(name, scene, data);

    this.position = scene.getComponent(Position);
    this.rigidbody = scene.getComponent(RigidBody);

    this.collider = {
      box: scene.components[ "BoxCollider" ],
    };

    this.query = scene.game.ecs.defineQuery([ this.position.store ]);
    this.enterQuery = scene.game.ecs.enterQuery( this.query );
    this.exitQuery = scene.game.ecs.exitQuery( this.query );
  }

  update( timeMilli:number ) {
    const position = this.position.store;

    const add = this.enterQuery(this.scene.world);
    for ( const eid of add ) {
      // XXX: RigidBodies should be a different color from collider-only
      // objects
      if ( this.scene.game.ecs.hasComponent( this.scene.world, this.collider.box.store, eid ) ) {
        const box = this.collider.box.store;
        const geometry = new three.BoxGeometry(1, 1, 1);
        const wireframe = new three.WireframeGeometry( geometry );
        const mat = new three.LineBasicMaterial( { color: 0x996633, linewidth: 2 } );
        const collider = new three.LineSegments( wireframe, mat );
        collider.position.set( box.ox[eid] + position.x[eid], box.oy[eid] + position.y[eid], box.oz[eid] + position.z[eid] );
        collider.scale.set(box.sx[eid] * position.sx[eid], box.sy[eid] * position.sy[eid], box.sz[eid] * position.sz[eid]);
        collider.material.depthTest = false;
        collider.material.transparent = true;

        this.bodies[eid] = collider;
        this.scene._scene.add( collider );
        console.log( `Created collider object`, collider );
      }
    }

    const remove = this.exitQuery(this.scene.world);
    for ( const eid of remove ) {
      this.scene._scene.remove( this.bodies[eid] );
      delete this.bodies[eid];
    }

    const update = this.query(this.scene.world);
    for ( const eid of update ) {
      let collider = this.bodies[eid];
      if ( !collider ) {
        continue;
      }
      // XXX: Update collider dimensions and position
    }
  }
}
