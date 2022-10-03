
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from '../../Scene.ts';

export default class Physics {
  scene:Scene;
  position:any;
  collider:Object = {};

  bodies:Array = [];

  constructor( scene:Scene ) {
    this.scene = scene;

    this.position = scene.components[ "Position" ];
    this.collider.box = scene.components[ "BoxCollider" ];

    this.query = bitecs.defineQuery([ this.position.store ]);
    this.enterQuery = bitecs.enterQuery( this.query );
    this.exitQuery = bitecs.exitQuery( this.query );
  }

  update( timeMilli:Number ) {
    const position = this.position.store;

    const add = this.enterQuery(this.scene.world);
    for ( const eid of add ) {
      if ( bitecs.hasComponent( this.scene.world, this.collider.box.store, eid ) ) {
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
      // XXX
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
