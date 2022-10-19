
import * as three from 'three';
import * as bitecs from 'bitecs';
import System from '../System.js';
import Scene from '../Scene.js';
import Position from '../component/Position.js';
import OrthographicCameraComponent from '../component/OrthographicCamera.js';
import { ResizeEvent } from '../Game.js';

export default class Render extends System {
  cameras:Array<three.OrthographicCamera|undefined> = [];
  component:OrthographicCameraComponent;
  position:Position;

  query:bitecs.Query;
  enterQuery:bitecs.Query;
  exitQuery:bitecs.Query;

  constructor( name:string, scene:Scene, data:any ) {
    super(name, scene, data);

    this.position = scene.getComponent(Position);
    this.component = scene.getComponent(OrthographicCameraComponent);

    this.query = scene.game.ecs.defineQuery([ this.position.store, this.component.store ]);
    this.enterQuery = scene.game.ecs.enterQuery( this.query );
    this.exitQuery = scene.game.ecs.exitQuery( this.query );

    scene.addEventListener( "resize", (e:any) => {
      this.onResize(e as ResizeEvent);
    });
  }

  update( timeMilli:number ) {
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
      const camera = this.cameras[eid];
      if ( !camera ) {
        continue;
      }
      camera.position.x = this.position.store.x[eid];
      camera.position.y = this.position.store.y[eid];
      camera.position.z = this.position.store.z[eid];
      camera.far = this.component.store.far[eid];
      camera.near = this.component.store.near[eid];
      camera.zoom = this.component.store.zoom[eid];
      camera.updateProjectionMatrix();
      this.scene.game.renderer.render( this.scene._scene, camera );
    }
  }

  add( eid:number ) {
    console.log( `Adding camera ${eid}` );
    const { width, height } = this.scene.game;
    const ratio = width / height;
    // Point a camera at 0, 0
    // Frustum size appears to work the same as zoom for an
    // orthographic camera, which makes sense
    const cameraData = this.component.store;
    const frustumSize = cameraData.frustum[eid] || 20;
    const far = cameraData.far[eid] || 10;
    const near = cameraData.near[eid] || 0;
    const camera = new three.OrthographicCamera(
      frustumSize * (ratio/-2),
      frustumSize * (ratio/2),
      frustumSize /2,
      frustumSize /-2,
      near, far,
    );
    this.cameras[eid] = camera;
    camera.zoom = cameraData.zoom[eid] || 4;

    this.scene._scene.add( camera );
  }

  remove( eid:number ) {
    const camera = this.cameras[eid];
    if ( camera ) {
      this.scene._scene.remove( camera );
      this.cameras[eid] = undefined;
    }
  }

  onResize(e:ResizeEvent) {
    // Fix camera settings to maintain exact size/aspect
    const { width, height } = e;
    const ratio = width / height;
    const update = this.query(this.scene.world);
    for ( const eid of update ) {
      const frustumSize = this.component.store.frustum[eid];
      const camera = this.cameras[eid];
      if ( !camera ) {
        continue;
      }
      camera.left = frustumSize * ratio / -2;
      camera.right = frustumSize * ratio / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2
      camera.updateProjectionMatrix();
    }
  }
}
