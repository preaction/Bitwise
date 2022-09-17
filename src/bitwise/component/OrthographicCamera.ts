
import * as three from 'three';
import Scene from './Scene.ts';

export default class OrthographicCamera {
  camera:three.OrthographicCamera;

  frustumSize:Number = 2;

  addToScene( scene:Scene ) {
    this.scene = scene;
    const { width, height } = scene.game;
    // Point a camera at 0, 0
    // Frustum size appears to work the same as zoom for an
    // orthographic camera, which makes sense
    const frustumSize = this.frustumSize;
    const camera = new three.OrthographicCamera(frustumSize * (width/-2), frustumSize * (width/2), frustumSize * (height/2), frustumSize * (height/-2), 0);
    this.camera = camera;
    // Z-position determines which objects are rendered? Use z-position
    // for layering?
    camera.position.z = camera.far;
    camera.zoom = 4;

    scene.addEventListener( "resize", (e:Object) => this.onResize(e) );
    scene._scene.add( camera );
  }

  onResize(e:{width:Number, height:Number}) {
    // Fix camera settings to maintain exact size/aspect
    const { width, height } = e;
    const frustumSize = this.frustumSize;
    const camera = this.camera;
    camera.left = frustumSize * (width/-2);
    camera.right = frustumSize * (width/2);
    camera.top = frustumSize * (height/2);
    camera.bottom = frustumSize * (height/-2);
    camera.updateProjectionMatrix();
  }

  render(renderer:three.Renderer, scene:Scene) {
    renderer.render( scene, this.camera );
  }
}
