
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from './Scene.ts';

export default class OrthographicCamera {
  scene:Scene;
  cameras:three.OrthographicCamera[] = [];
  component:any;
  position:any;

  constructor( scene:Scene ) {
    this.scene = scene;
    this.component = bitecs.defineComponent( this.componentData );
    this.position = scene.systems.Position;
    this.query = bitecs.defineQuery([ this.position.component, this.component ]);
    this.enterQuery = bitecs.enterQuery( this.query );
    this.exitQuery = bitecs.exitQuery( this.query );

    scene.addEventListener( "resize", (e:Object) => this.onResize(e) );
  }

  get world() {
    return this.scene.world;
  }

  get componentData() {
    return {
      frustum: bitecs.Types.f32,
      zoom: bitecs.Types.f32,
      near: bitecs.Types.f32,
      far: bitecs.Types.f32,
    }
  }

  update( timeMilli:Number ) {
    // enteredQuery for cameraQuery: Create Camera and add to Scene
    const add = this.enterQuery(this.world);
    for ( const eid of add ) {
      this.add( eid ); 
    }

    // cameraQuery: Update camera properties if needed
    const update = this.query(this.world);
    for ( const eid of update ) {
      // XXX
    }

    // exitedQuery for cameraQuery: Remove Camera from Scene
    const remove = this.exitQuery(this.world);
    for ( const eid of remove ) {
      // XXX
    }
  }

  add( eid:Number ) {
    console.log( `Adding camera ${eid}` );
    const { width, height } = this.scene.game;
    // Point a camera at 0, 0
    // Frustum size appears to work the same as zoom for an
    // orthographic camera, which makes sense
    const frustumSize = this.component.frustum[eid] || 2;
    const far = this.component.far[eid] || 10;
    const near = this.component.near[eid] || 0;
    const camera = new three.OrthographicCamera(frustumSize * (width/-2), frustumSize * (width/2), frustumSize * (height/2), frustumSize * (height/-2), near, far);
    this.cameras[eid] = camera;
    camera.zoom = this.component.zoom[eid] || 4;
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

  render(renderer:three.Renderer) {
    // enteredQuery for cameraQuery: Create Camera and add to Scene
    const add = this.enterQuery(this.world);
    for ( const eid of add ) {
      this.add( eid ); 
    }

    const cameras = this.query(this.world);
    for ( const eid of cameras ) {
      renderer.render( this.scene._scene, this.cameras[eid] );
    }
  }
}
