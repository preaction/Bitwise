
import * as three from 'three';
import Ammo from 'ammo.js';
import System from '../System.js';
import Scene from '../Scene.js';

export default class Physics extends System {
  rigidbody:any;
  position:any;
  collider:Object = {};

  universe:any;
  bodies:Array = [];

  constructor( name:string, scene:Scene, data:Object ) {
    super( name, scene, data );

    this.position = scene.components[ "Position" ];
    this.rigidbody = scene.components[ "RigidBody" ];
    this.collider.box = scene.components[ "BoxCollider" ];

    this.query = scene.game.ecs.defineQuery([ this.position.store, this.rigidbody.store ]);
    this.enterQuery = scene.game.ecs.enterQuery( this.query );
    this.exitQuery = scene.game.ecs.exitQuery( this.query );

    this.initAmmo();
  }

  initAmmo() {
    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    const overlappingPairCache = new Ammo.btDbvtBroadphase();
    const solver = new Ammo.btSequentialImpulseConstraintSolver();
    this.universe = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    // XXX: Gravity should be configuration
    this.universe.setGravity(new Ammo.btVector3(0, -0.75, 0));
  }

  update( timeMilli:number ) {
    const position = this.position.store;
    const rigidBody = this.rigidbody.store;

    const add = this.enterQuery(this.scene.world);
    for ( const eid of add ) {
      let transform = new Ammo.btTransform();
      transform.setIdentity();
      transform.setOrigin( new Ammo.btVector3( position.x[eid], position.y[eid], position.z[eid] ) );

      transform.setRotation( new Ammo.btQuaternion( position.rx[eid], position.ry[eid], position.rz[eid], position.rw[eid] ) );
      let motionState = new Ammo.btDefaultMotionState( transform );

      let collider;
      if ( this.scene.game.ecs.hasComponent( this.scene.world, this.collider.box.store, eid ) ) {
        const box = this.collider.box.store;
        // Scale should be adjusted by object scale
        const scale = new Ammo.btVector3(box.sx[eid] * position.sx[eid], box.sy[eid] * position.sy[eid], box.sz[eid] * position.sz[eid]);
        collider = new Ammo.btBoxShape(scale);
        collider.setMargin( 0.05 );
        const origin = new Ammo.btVector3( box.ox[eid], box.oy[eid], box.oz[eid] ) 
        transform.setOrigin( transform.getOrigin() + origin );
      }

      // Calculate mass and initial inertia for dynamic bodies. Static
      // bodies have a mass of 0. Kinematic bodies collide but are not
      // affected by dynamic bodies.
      const mass = rigidBody.mass[eid];
      let inertia;
      if ( mass > 0 ) {
        console.log( `Mass: ${mass}, Velocity: ${rigidBody.vx[eid]}, ${rigidBody.vy[eid]}, ${rigidBody.vz[eid]}` );
        inertia = new Ammo.btVector3( rigidBody.vx[eid], rigidBody.vy[eid], rigidBody.vz[eid] );
        collider.calculateLocalInertia( mass, inertia );
      }

      let rbodyInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, collider, inertia );
      let rbody = new Ammo.btRigidBody( rbodyInfo );
      this.universe.addRigidBody( rbody );
      this.bodies[eid] = rbody;
      console.log( `Created rigidbody`, rbody );
    }

    const remove = this.exitQuery(this.scene.world);
    for ( const eid of remove ) {
      // XXX
    }

    this.universe.stepSimulation( timeMilli, 10 );
    const update = this.query(this.scene.world);
    const xform = new Ammo.btTransform();
    for ( const eid of update ) {
      let motionState = this.bodies[eid].getMotionState();
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

        // XXX: Detect collisions and do something with them
        
      }
    }
  }
}
