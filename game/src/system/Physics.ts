
import * as bitecs from 'bitecs';
import Ammo from 'ammo.js';
import System from '../System.js';
import Scene from '../Scene.js';
import Position from '../component/Position.js';
import RigidBody from '../component/RigidBody.js';
import BoxCollider from '../component/BoxCollider.js';

type ColliderMap = {
  box?: BoxCollider,
};
type ColliderQueryMap = {
  [key in keyof ColliderMap]: bitecs.Query;
};
const COLLIDER_SHAPES = {
  box: Ammo.btBoxShape,
};

const COLLISION_FLAGS = {
  CF_NO_CONTACT_RESPONSE: 4,
};

export default class Physics extends System {
  static Broadphase = {
    AxisSweep: 0,
    Dbvt: 1,
  };
  static broadphaseClass = {
    [Physics.Broadphase.AxisSweep]: "btAxisSweep3",
    [Physics.Broadphase.Dbvt]: "btDbvtBroadphase",
  };

  rigidbody!:RigidBody;
  position!:Position;
  collider:ColliderMap = {};
  broadphase:number = Physics.Broadphase.AxisSweep;
  gravity:any;

  universe:any; //Ammo.btCollisionWorld;
  bodies:Array<any> = [];

  colliderQueries:ColliderQueryMap = {};
  rigidbodyQuery!:bitecs.Query;
  enterQueries:ColliderQueryMap = {};
  exitQueries:ColliderQueryMap = {};

  watchQueries:Array<[ bitecs.Query, (...args:any) => void ]> = [];

  start() {
    const scene = this.scene;

    this.position = scene.getComponent(Position);
    this.rigidbody = scene.getComponent(RigidBody);

    this.collider = {
      box: scene.getComponent(BoxCollider),
    };

    for ( const [name, collider] of Object.entries(this.collider) ) {
      const query = scene.game.ecs.defineQuery([ this.position.store, collider.store ]);
      this.colliderQueries[name as keyof ColliderMap] = query;
      this.enterQueries[name as keyof ColliderMap] = scene.game.ecs.enterQuery( query );
      this.exitQueries[name as keyof ColliderMap] = scene.game.ecs.exitQuery( query );
    }
    this.rigidbodyQuery = scene.game.ecs.defineQuery([ this.position.store, this.rigidbody.store ]);

    this.initAmmo();
  }

  freeze() {
    const data = super.freeze();
    data.gx = this.gravity?.x() || 0;
    data.gy = this.gravity?.y() || 0;
    data.gz = this.gravity?.z() || 0;
    data.broadphase = this.broadphase || Physics.Broadphase.AxisSweep;
    return data;
  }

  thaw( data:any ) {
    super.thaw(data);
    this.broadphase = data.broadphase || Physics.Broadphase.AxisSweep;
    this.gravity = new Ammo.btVector3(data.gx || 0, data.gy || 0, data.gz || 0)
  }

  watchQuery( query:bitecs.Query, cb:(...args:any) => void ) {
    this.watchQueries.push( [ query, cb ] );
  }

  initAmmo() {
    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    const broadphase = new Ammo[ Physics.broadphaseClass[ this.broadphase] ]();
    const solver = new Ammo.btSequentialImpulseConstraintSolver();
    this.universe = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
    this.universe.setGravity(this.gravity);
  }

  update( timeMilli:number ) {
    const position = this.position.store;
    const rigidBody = this.rigidbody.store;

    // Create any new colliders
    for ( const [colliderName, query] of Object.entries(this.enterQueries) ) {
      const add = query(this.scene.world);
      for ( const eid of add ) {
        const colliderData = this.collider[colliderName as keyof ColliderMap]?.store;
        if ( !colliderData ) {
          throw `Unknown collider ${colliderName}`;
        }

        let transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin( new Ammo.btVector3( position.x[eid], position.y[eid], position.z[eid] ) );
        console.log( `${eid}: Initial position: ${position.x[eid]}, ${position.y[eid]}, ${position.z[eid]}` );

        transform.setRotation( new Ammo.btQuaternion( position.rx[eid], position.ry[eid], position.rz[eid], position.rw[eid] ) );
        let motionState = new Ammo.btDefaultMotionState( transform );

        // Scale should be adjusted by object scale
        console.log( `${eid}: Collider ${colliderName} scale: ${colliderData.sx[eid] * position.sx[eid]}, ${colliderData.sy[eid] * position.sy[eid]}, ${colliderData.sz[eid] * position.sz[eid]}` );
        const scale = new Ammo.btVector3(colliderData.sx[eid] * position.sx[eid] / 2, colliderData.sy[eid] * position.sy[eid] / 2, colliderData.sz[eid] * position.sz[eid] / 2);
        const collider = new COLLIDER_SHAPES[colliderName as keyof ColliderMap](scale);
        collider.setMargin( 0 );
        const origin = new Ammo.btVector3( colliderData.ox[eid], colliderData.oy[eid], colliderData.oz[eid] );
        transform.setOrigin( transform.getOrigin() + origin );

        // If the item has a rigidbody, it can have mass
        let body;
        const group:number = 1; // XXX: Add group/mask to collider shapes
        const mask:number = -1;

        // Calculate mass and initial inertia for dynamic bodies. Static
        // bodies have a mass of 0. Kinematic bodies collide but are not
        // affected by dynamic bodies.
        const mass = rigidBody.mass[eid];

        let inertia = new Ammo.btVector3( 0, 0, 0 );
        if ( mass > 0 ) {
          collider.calculateLocalInertia( mass, inertia );
        }

        console.log( `${eid}: RigidBody Mass: ${mass}, Velocity: ${rigidBody.vx[eid]}, ${rigidBody.vy[eid]}, ${rigidBody.vz[eid]}` );
        let velocity = new Ammo.btVector3( rigidBody.vx[eid], rigidBody.vy[eid], rigidBody.vz[eid] );

        let rbodyInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, collider, inertia );
        body = new Ammo.btRigidBody( rbodyInfo );
        body.setLinearFactor( new Ammo.btVector3( rigidBody.lx[eid], rigidBody.ly[eid], rigidBody.lz[eid] ) );
        body.setAngularFactor( new Ammo.btVector3( rigidBody.ax[eid], rigidBody.ay[eid], rigidBody.az[eid] ) );
        body.applyImpulse( velocity );

        if ( colliderData.trigger[eid] ) {
          body.setCollisionFlags( COLLISION_FLAGS.CF_NO_CONTACT_RESPONSE );
        }

        this.universe.addRigidBody( body, group, mask );

        body.eid = eid;
        this.bodies[eid] = body;
      }
    }

    for ( const [colliderName, query] of Object.entries(this.exitQueries) ) {
      const remove = query(this.scene.world);
      for ( const eid of remove ) {
        this.universe.removeCollisionObject( this.bodies[eid] );
        delete this.bodies[eid];
      }
    }

    this.universe.stepSimulation( timeMilli/1000, 1 );
    // Detect all collisions
    const collisions:{ [key:number]: Set<number> } = {};
    let dispatcher = this.universe.getDispatcher();
    let numManifolds = dispatcher.getNumManifolds();
    MANIFOLDS:
    for ( let i = 0; i < numManifolds; i ++ ) {
      let contactManifold = dispatcher.getManifoldByIndexInternal( i );
      let numContacts = contactManifold.getNumContacts();
      for ( let j = 0; j < numContacts; j++ ) {
        let contactPoint = contactManifold.getContactPoint( j );
        let distance = contactPoint.getDistance();
        if ( distance > 0.0 ) {
          continue;
        }

        let rb0 = Ammo.castObject( contactManifold.getBody0(), Ammo.btRigidBody );
        let rb1 = Ammo.castObject( contactManifold.getBody1(), Ammo.btRigidBody );
        if ( !collisions[rb0.eid] ) {
          collisions[rb0.eid] = new Set<number>();
        }
        if ( !collisions[rb1.eid] ) {
          collisions[rb1.eid] = new Set<number>();
        }
        collisions[rb0.eid].add(rb1.eid);
        collisions[rb1.eid].add(rb0.eid);
        continue MANIFOLDS;
      }
    }

    // Dispatch any collisions that we're watching
    for ( const [ query, cb ] of this.watchQueries ) {
      const eids = query(this.scene.world)
      for ( const eid of eids.filter( eid => eid in collisions ) ) {
        cb( eid, collisions[eid] )
      }
    }

    for ( const [colliderName, query] of Object.entries(this.colliderQueries) ) {
      const update = query(this.scene.world);
      for ( const eid of update ) {
        const body = this.bodies[eid];
        // Rigidbodies are moved by physics
        if ( body instanceof Ammo.btRigidBody ) {
          const xform = new Ammo.btTransform();
          const motionState = body.getMotionState();
          if ( motionState ) {
            motionState.getWorldTransform( xform );
            let pos = xform.getOrigin();
            position.x[eid] = pos.x();
            position.y[eid] = pos.y();
            position.z[eid] = pos.z();

            let rot = xform.getRotation();
            position.rx[eid] = rot.x();
            position.ry[eid] = rot.y();
            position.rz[eid] = rot.z();
            position.rw[eid] = rot.w();
          }
        }
        // Ghost bodies are moved outside of physics
        else if ( body instanceof Ammo.btGhostObject ) {
          const xform = body.getWorldTransform();
          const pos = new Ammo.btVector3( position.x[eid], position.y[eid], position.z[eid] );
          const rot = new Ammo.btVector3( position.rx[eid], position.ry[eid], position.rz[eid] );
          xform.setOrigin(pos);
          xform.setRotation(rot);
          body.setWorldTransform(xform);
        }
      }
    }
  }
}
