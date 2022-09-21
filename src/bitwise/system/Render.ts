
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from './Scene.ts';

export default class Render {
  scene:Scene;
  cameras:three.OrthographicCamera[] = [];
  component:any;
  position:any;

  constructor( scene:Scene ) {
    this.scene = scene;

    this.position = scene.components[ "Position" ];
    if ( !this.position ) {
      throw "Position component required";
    }
    this.component = scene.components[ "OrthographicCamera" ];
    if ( !this.component ) {
      throw "OrthographicCamera component required";
    }

    this.query = bitecs.defineQuery([ this.position.store, this.component.store ]);
    this.enterQuery = bitecs.enterQuery( this.query );
    this.exitQuery = bitecs.exitQuery( this.query );

    scene.addEventListener( "resize", (e:Object) => this.onResize(e) );
  }

  update( timeMilli:Number ) {
  }

  render() {
    // enteredQuery for cameraQuery: Create Camera and add to Scene
    const add = this.enterQuery(this.scene.world);
    for ( const eid of add ) {
      this.add( eid ); 
    }

    // exitedQuery for cameraQuery: Remove Camera from Scene
    const remove = this.exitQuery(this.scene.world);
    for ( const eid of remove ) {
      // XXX
    }

    // cameraQuery: Update camera properties and render if needed
    const update = this.query(this.scene.world);
    for ( const eid of update ) {
      // XXX: Object3d should be its own component somehow
      this.scene.game.renderer.render( this.scene._scene, this.cameras[eid] );
    }
  }

  add( eid:Number ) {
    console.log( `Adding camera ${eid}` );
    const { width, height } = this.scene.game;
    // Point a camera at 0, 0
    // Frustum size appears to work the same as zoom for an
    // orthographic camera, which makes sense
    const cameraData = this.component.store;
    const frustumSize = cameraData.frustum[eid] || 2;
    const far = cameraData.far[eid] || 10;
    const near = cameraData.near[eid] || 0;
    const camera = new three.OrthographicCamera(frustumSize * (width/-2), frustumSize * (width/2), frustumSize * (height/2), frustumSize * (height/-2), near, far);
    this.cameras[eid] = camera;
    camera.zoom = cameraData.zoom[eid] || 4;
    console.log( `Near: ${camera.near}; Far: ${camera.far}` );

    this.scene._scene.add( camera );
  }

  remove( eid:Number ) {
    this.scene._scene.remove( this.cameras[eid] );
    this.cameras[eid] = null;
  }

  onResize(e:{width:Number, height:Number}) {
    // Fix camera settings to maintain exact size/aspect
    const { width, height } = e;
    const update = this.query(this.world);
    for ( const eid of update ) {
      const frustumSize = this.component.frustum[eid];
      const camera = this.cameras[eid];
      camera.left = frustumSize * (width/-2);
      camera.right = frustumSize * (width/2);
      camera.top = frustumSize * (height/2);
      camera.bottom = frustumSize * (height/-2);
      camera.updateProjectionMatrix();
    }
  }
}
