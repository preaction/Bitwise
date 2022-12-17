
import * as three from 'three';
import * as bitecs from 'bitecs';
import Ammo from 'ammojs-typed';
import System from '../System.js';
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
  gravity:three.Vector3 = new three.Vector3( 0, 0, 0 );

  Ammo!:typeof Ammo;
  universe:any; //Ammo.btCollisionWorld;
  bodies:Array<any> = [];
  ghosts:Array<any> = [];
  collisionObjects:Array<any> = [];

  colliderQueries:ColliderQueryMap = {};
  rigidbodyQuery!:bitecs.Query;
  enterQueries:ColliderQueryMap = {};
  exitQueries:ColliderQueryMap = {};

  watchEntities:Array<[ boolean, number, (eid:number, hits:Set<number>) => void ]> = [];
  watchQueries:Array<[ boolean, bitecs.Query, (eid:number, hits:Set<number>) => void ]> = [];
  collisions:{ [key:number]: Set<number> } = {};

  async init() {
    await this.initAmmo();
  }

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

    const collisionConfiguration = new this.Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new this.Ammo.btCollisionDispatcher(collisionConfiguration);
    const broadphase = new this.Ammo[ Physics.broadphaseClass[ this.broadphase] ]();
    const solver = new this.Ammo.btSequentialImpulseConstraintSolver();
    this.universe = new this.Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
    const gravity = new this.Ammo.btVector3( this.gravity.x, this.gravity.y, this.gravity.z );
    this.universe.setGravity(gravity);
  }

  freeze() {
    const data = super.freeze();
    data.gx = this.gravity?.x || 0;
    data.gy = this.gravity?.y || 0;
    data.gz = this.gravity?.z || 0;
    data.broadphase = this.broadphase || Physics.Broadphase.AxisSweep;
    return data;
  }

  thaw( data:any ) {
    super.thaw(data);
    this.broadphase = data.broadphase || Physics.Broadphase.AxisSweep;
    this.gravity = new three.Vector3(data.gx || 0, data.gy || 0, data.gz || 0)
  }

  /**
   * watchEnter adds a watcher for when an entity starts
   * colliding with another entity.
   */
  watchEnter( eid:number, cb:(eida:number, collisions:Set<number>) => void ) {
    this.watchEntities.push( [ true, eid, cb ] );
  }

  /**
   * watchExit adds a watcher for when an entity stops colliding
   * with another entity.
   */
  watchExit( eid:number, cb:(eida:number, collisions:Set<number>) => void ) {
    this.watchEntities.push( [ false, eid, cb ] );
  }

  /**
   * watchEnterByQuery adds a watcher for when an entity starts
   * colliding with another entity.
   */
  watchEnterByQuery( query:bitecs.Query, cb:(eida:number, collisions:Set<number>) => void ) {
    this.watchQueries.push( [ true, query, cb ] );
  }

  /**
   * watchExitByQuery adds a watcher for when an entity stops colliding
   * with another entity.
   */
  watchExitByQuery( query:bitecs.Query, cb:(eida:number, collisions:Set<number>) => void ) {
    this.watchQueries.push( [ false, query, cb ] );
  }

  async initAmmo() {
    return Ammo.bind(window)(Ammo).then( () => {
      this.Ammo = Ammo;
      COLLIDER_SHAPES.box = Ammo.btBoxShape;
    });
  }

  setVelocity( eid:number, vec:three.Vector3 ) {
    const body = this.bodies[eid];
    if ( !body ) {
      return;
    }
    const avec = new this.Ammo.btVector3( vec.x, vec.y, vec.z );
    body.activate();
    body.setLinearVelocity( avec );
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

        let transform = new this.Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin( new this.Ammo.btVector3( position.x[eid], position.y[eid], position.z[eid] ) );
        //console.log( `${eid}: Initial position: ${position.x[eid]}, ${position.y[eid]}, ${position.z[eid]}` );

        //transform.setRotation( new this.Ammo.btQuaternion( position.rx[eid], position.ry[eid], position.rz[eid], position.rw[eid] ) );
        let motionState = new this.Ammo.btDefaultMotionState( transform );

        // Scale should be adjusted by object scale
        //console.log( `${eid}: Collider ${colliderName} scale: ${colliderData.sx[eid] * position.sx[eid]}, ${colliderData.sy[eid] * position.sy[eid]}, ${colliderData.sz[eid] * position.sz[eid]}` );
        const scale = new this.Ammo.btVector3(colliderData.sx[eid] * position.sx[eid] / 2, colliderData.sy[eid] * position.sy[eid] / 2, colliderData.sz[eid] * position.sz[eid] / 2);
        const collider = new COLLIDER_SHAPES[colliderName as keyof ColliderMap](scale);
        collider.setMargin( 0.05 );
        const origin = new this.Ammo.btVector3( colliderData.ox[eid], colliderData.oy[eid], colliderData.oz[eid] );
        transform.setOrigin( origin.op_add( transform.getOrigin() ) );

        let body;
        const group:number = 1; // XXX: Add group/mask to collider shapes
        const mask:number = -1;
        // If the item has a rigidbody, it can have mass
        if ( bitecs.hasComponent( this.scene.world, this.rigidbody.store, eid ) ) {
          // Calculate mass and initial inertia for dynamic bodies. Static
          // bodies have a mass of 0. Kinematic bodies collide but are not
          // affected by dynamic bodies.
          const mass = rigidBody.mass[eid];

          let inertia = new this.Ammo.btVector3( 0, 0, 0 );
          if ( mass > 0 ) {
            collider.calculateLocalInertia( mass, inertia );
          }

          //console.log( `${eid}: RigidBody Mass: ${mass}, Velocity: ${rigidBody.vx[eid]}, ${rigidBody.vy[eid]}, ${rigidBody.vz[eid]}` );
          //console.log( `${eid}: RigidBody Lin Factor: ${rigidBody.lx[eid]}, ${rigidBody.ly[eid]}, ${rigidBody.lz[eid]}; Ang Factor: ${rigidBody.ax[eid]}, ${rigidBody.ay[eid]}, ${rigidBody.az[eid]}` );

          let rbodyInfo = new this.Ammo.btRigidBodyConstructionInfo( mass, motionState, collider, inertia );
          body = new this.Ammo.btRigidBody( rbodyInfo );
          body.setLinearFactor( new this.Ammo.btVector3( rigidBody.lx[eid], rigidBody.ly[eid], rigidBody.lz[eid] ) );
          body.setAngularFactor( new this.Ammo.btVector3( rigidBody.ax[eid], rigidBody.ay[eid], rigidBody.az[eid] ) );

          const velocity = new this.Ammo.btVector3( rigidBody.vx[eid], rigidBody.vy[eid], rigidBody.vz[eid] );
          body.applyCentralImpulse( velocity );

          const torque = new this.Ammo.btVector3( rigidBody.rx[eid], rigidBody.ry[eid], rigidBody.rz[eid] );
          body.applyTorqueImpulse( torque );

          this.universe.addRigidBody( body, group, mask );
          this.bodies[eid] = body;
        }
        else {
          // Create a ghost body for this collider
          body = new this.Ammo.btGhostObject();
          body.setCollisionShape(collider);
          body.setWorldTransform(transform);
          this.universe.addCollisionObject( body, group, mask );
          this.ghosts[eid] = body;
        }

        if ( colliderData.trigger[eid] ) {
          body.setCollisionFlags( COLLISION_FLAGS.CF_NO_CONTACT_RESPONSE );
        }

        const collisionObject = this.Ammo.castObject( body, this.Ammo.btCollisionObject );
        collisionObject.eid = eid;
        this.collisionObjects[eid] = collisionObject;
      }
    }

    for ( const [colliderName, query] of Object.entries(this.exitQueries) ) {
      const remove = query(this.scene.world);
      for ( const eid of remove ) {
        this.universe.removeRigidBody( this.collisionObjects[eid] );
        delete this.collisionObjects[eid];
        delete this.ghosts[eid];
        delete this.bodies[eid];
      }
    }

    this.universe.stepSimulation( timeMilli/1000, 1 );

    // Detect all changes in collisions
    const newCollisions:{ [key:number]: Set<number> } = {};
    const enters:{ [key:number]: Set<number> } = {};
    let dispatcher = this.universe.getDispatcher();
    let numManifolds = dispatcher.getNumManifolds();
    MANIFOLDS:
    for ( let i = 0; i < numManifolds; i ++ ) {
      let contactManifold = dispatcher.getManifoldByIndexInternal( i );
      let rb0 = this.Ammo.castObject( contactManifold.getBody0(), this.Ammo.btCollisionObject );
      let rb1 = this.Ammo.castObject( contactManifold.getBody1(), this.Ammo.btCollisionObject );
      const [ from, to ] = rb0.eid < rb1.eid ? [ rb0.eid, rb1.eid ] : [ rb1.eid, rb0.eid ];

      if ( !newCollisions[from] ) {
        newCollisions[from] = new Set<number>();
      }
      if ( !newCollisions[to] ) {
        newCollisions[to] = new Set<number>();
      }

      if ( newCollisions[from].has(to) ) {
        continue;
      }

      newCollisions[from].add(to);
      newCollisions[to].add(from);

      // Figure out if this is an entering collision
      if ( this.collisions[from] && this.collisions[from].has(to) ) {
        // Remove new collisions from the old cache so anything
        // that remains is a leaving collision event
        this.collisions[from].delete(to);
        if ( this.collisions[from].size == 0 ) {
          delete this.collisions[from];
        }
        this.collisions[to].delete(from);
        if ( this.collisions[to].size == 0 ) {
          delete this.collisions[to];
        }
      }
      else {
        if ( !enters[from] ) {
          enters[from] = new Set();
        }
        if ( !enters[to] ) {
          enters[to] = new Set();
        }
        enters[from].add(to);
        enters[to].add(from);
      }

      // XXX: Some tutorials have told me to check the distance of the
      // contact points, but not every manifold has a contact point. My
      // best guess is that one object completely inside another object
      // has a contact manifold, but no actual points of contact.
      // let numContacts = contactManifold.getNumContacts();
      // console.log( `Found collision ${from}/${to} (contacts ${numContacts})` );
      // for ( let j = 0; j < numContacts; j++ ) {
      //   let contactPoint = contactManifold.getContactPoint( j );
      //   let distance = contactPoint.getDistance();
      //   if ( distance > 0.0 ) {
      //     continue;
      //   }
      //   continue MANIFOLDS;
      // }
    }

    // Anything left in this.collisions is not in newCollisions
    // Dispatch any collisions that we're watching
    for ( const [ collide, eid, cb ] of this.watchEntities ) {
      const data = collide ? enters : this.collisions;
      if ( eid in data ) {
        cb( eid, data[eid] )
      }
    }
    for ( const [ collide, query, cb ] of this.watchQueries ) {
      const data = collide ? enters : this.collisions;
      const eids = query(this.scene.world)
      for ( const eid of eids.filter( eid => eid in data ) ) {
        cb( eid, data[eid] )
      }
    }

    this.collisions = newCollisions;

    for ( const [colliderName, query] of Object.entries(this.colliderQueries) ) {
      const update = query(this.scene.world);
      for ( const eid of update ) {
        // Ghost bodies are moved outside of physics
        if ( eid in this.ghosts ) {
          const body = this.ghosts[eid];
          const xform = body.getWorldTransform();
          const pos = new this.Ammo.btVector3( position.x[eid], position.y[eid], position.z[eid] );
          const rot = new this.Ammo.btVector3( position.rx[eid], position.ry[eid], position.rz[eid] );
          xform.setOrigin(pos);
          xform.setRotation(rot);
          body.setWorldTransform(xform);
        }
        // Rigidbodies are moved by physics
        else {
          const body = this.Ammo.castObject( this.bodies[eid], this.Ammo.btRigidBody );
          const xform = new this.Ammo.btTransform();
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
      }
    }
  }
}
