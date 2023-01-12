
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from '../../Scene.js';
import System from '../../System.js';
import Component from '../../Component.js';
import Transform from '../../component/Transform.js';
import RigidBody from '../../component/RigidBody.js';
import PhysicsSystem from '../Physics.js';

// XXX: This should subclass the standard Physics system
export default class Physics extends System {
  rigidbody:RigidBody;
  transform:Transform;
  collider:{ box: Component };
  gravity:three.Vector3 = new three.Vector3( 0, 0, 0 );
  broadphase:number = 0;
  //broadphase:number = PhysicsSystem.Broadphase.AxisSweep;

  bodies:Array<any> = [];

  rigidBodyQuery:bitecs.Query;
  rigidBodyEnterQuery:bitecs.Query;
  rigidBodyExitQuery:bitecs.Query;

  constructor( name:string, scene:Scene ) {
    super(name, scene);

    this.transform = scene.getComponent(Transform);
    this.rigidbody = scene.getComponent(RigidBody);

    this.collider = {
      box: scene.components[ "BoxCollider" ],
    };

    this.rigidBodyQuery = scene.game.ecs.defineQuery([ this.transform.store ]);
    this.rigidBodyEnterQuery = scene.game.ecs.enterQuery( this.rigidBodyQuery );
    this.rigidBodyExitQuery = scene.game.ecs.exitQuery( this.rigidBodyQuery );
  }

  freeze():any {
    const data = super.freeze();
    data.gx = this.gravity?.x || 0;
    data.gy = this.gravity?.y || 0;
    data.gz = this.gravity?.z || 0;
    data.broadphase = this.broadphase //|| PhysicsSystem.Broadphase.AxisSweep;
    return data;
  }

  thaw( data:any ) {
    this.broadphase = data.broadphase //|| PhysicsSystem.Broadphase.AxisSweep;
    this.gravity = new three.Vector3(data.gx || 0, data.gy || 0, data.gz || 0)
    super.thaw(data);
  }

  update( timeMilli:number ) {
    const transform = this.transform.store;

    const add = this.rigidBodyEnterQuery(this.scene.world);
    for ( const eid of add ) {
      // XXX: RigidBodies should be a different color from collider-only
      // objects
      if ( this.scene.game.ecs.hasComponent( this.scene.world, this.collider.box.store, eid ) ) {
        const geometry = new three.BoxGeometry(1, 1, 1);
        const wireframe = new three.WireframeGeometry( geometry );
        const mat = new three.LineBasicMaterial( { color: 0x996633, linewidth: 2 } );
        const collider = new three.LineSegments( wireframe, mat );
        collider.material.depthTest = false;
        collider.material.transparent = true;

        this.bodies[eid] = collider;
        this.scene._scene.add( collider );
      }
    }

    const remove = this.rigidBodyExitQuery(this.scene.world);
    for ( const eid of remove ) {
      this.scene._scene.remove( this.bodies[eid] );
      delete this.bodies[eid];
    }

    const update = this.rigidBodyQuery(this.scene.world);
    for ( const eid of update ) {
      let collider = this.bodies[eid];
      if ( !collider ) {
        continue;
      }
      // Update collider dimensions and transform
      const box = this.collider.box.store;
      collider.position.set( box.ox[eid] + transform.x[eid], box.oy[eid] + transform.y[eid], box.oz[eid] + transform.z[eid] );
      collider.scale.set(box.sx[eid] * transform.sx[eid], box.sy[eid] * transform.sy[eid], box.sz[eid] * transform.sz[eid]);
    }
  }
}
