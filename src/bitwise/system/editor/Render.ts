
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from '../../Scene.js';
import System from '../../System.js';

export default class Render extends System {
  camera:three.OrthographicCamera;

  sceneCameras:three.OrthographicCamera[] = [];
  component:any;
  position:any;

  query:bitecs.Query;
  enterQuery:bitecs.Query;
  exitQuery:bitecs.Query;

  constructor( name:string, scene:Scene, data:any ) {
    super(name, scene, data);

    this.position = scene.components[ "Position" ];
    if ( !this.position ) {
      throw "Position component required";
    }
    this.component = scene.components[ "OrthographicCamera" ];
    if ( !this.component ) {
      throw "OrthographicCamera component required";
    }

    this.query = scene.game.ecs.defineQuery([ this.position.store, this.component.store ]);
    this.enterQuery = scene.game.ecs.enterQuery( this.query );
    this.exitQuery = scene.game.ecs.exitQuery( this.query );

    scene.addEventListener( "resize", (e:Object) => {
      this.onResize(e);
    });
    scene.game.input.on( 'wheel', this.onWheel.bind(this) );
    scene.game.input.on( 'mousedown', this.onMouseDown.bind(this) );
    scene.game.input.on( 'mouseup', this.onMouseUp.bind(this) );
    scene.game.input.on( 'mousemove', this.onMouseMove.bind(this) );

    this.camera = this.createCamera();
  }

  onWheel( event:WheelEvent ) {
    event.preventDefault();
    // XXX: Zoom when mouse is at coordinates other than 0,0 should move
    // the window to keep the pixel under the cursor in the same place
    this.camera.zoom += event.deltaY * 0.01;
    if ( this.camera.zoom < 0.001 ) {
      this.camera.zoom = 0.001;
    }
    this.camera.updateProjectionMatrix();
    this.render();
  }

  mouseIsDown:boolean = false;
  onMouseDown( event:MouseEvent ) {
    event.preventDefault();
    this.mouseIsDown = true;
    // XXX: Mouse down outside selected element de-selects
  }

  onMouseUp( event:MouseEvent ) {
    event.preventDefault();
    this.mouseIsDown = false;
    // XXX: Mouse up without moving selects element
  }

  onMouseMove( event:MouseEvent ) {
    event.preventDefault();
    // XXX: Mouse move with object selected moves object
    // XXX: Mouse move with button down moves camera
    if ( this.mouseIsDown ) {
      const { movementX: x, movementY: y } = event;
      this.camera.position.x -= x / this.camera.zoom / 2.5;
      this.camera.position.y += y / this.camera.zoom / 2.5;
      this.render();
    }
  }

  update( timeMilli:number ) {
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
      const camera = this.sceneCameras[eid];
      camera.position.x = this.position.store.x[eid];
      camera.position.y = this.position.store.y[eid];
      camera.position.z = this.position.store.z[eid];

      // Update wireframe width/height/depth
      // It's not the current game we want, we want the player game
      // size
      const { gameWidth, gameHeight } = this.scene.game.data;
      const ratio = gameWidth / gameHeight;

      const frustumSize = this.component.store.frustum[eid] || 20;
      const width = frustumSize * ratio;
      const height = frustumSize;
      const far = this.component.store.far[eid];
      const near = this.component.store.near[eid];
      const depth = far - near;
      console.log( `Wireframe scale ${width}, ${height}, ${depth} (ratio ${ratio})` );
      this.sceneCameras[eid].scale.set( width, height, depth );
    }
  }

  render() {
    this.scene.game.renderer.render( this.scene._scene, this.camera );
  }

  frustumSize = 200;
  zoom = 1;

  createCamera() {
    console.log( `Creating editor camera` );
    const { width, height } = this.scene.game;
    const ratio = width / height;
    // Point a camera at 0, 0
    // Frustum size appears to work the same as zoom for an
    // orthographic camera, which makes sense
    const frustumSize = this.frustumSize;
    const far = 10;
    const near = 0;
    const camera = new three.OrthographicCamera(
      frustumSize * (ratio/-2),
      frustumSize * (ratio/2),
      frustumSize /2,
      frustumSize /-2,
      near, far,
    );
    camera.zoom = this.zoom;
    camera.updateProjectionMatrix();
    return camera;
  }

  add( eid:number ) {
    console.log( `Adding wireframe for camera ${eid}` );
    const { gameWidth, gameHeight } = this.scene.game.data;
    const ratio = gameWidth / gameHeight;

    const frustumSize = this.component.store.frustum[eid] || 20;
    const width = frustumSize * ratio;
    const height = frustumSize;
    const far = this.component.store.far[eid];
    const near = this.component.store.near[eid];
    const depth = far - near;

    const geometry = new three.BoxGeometry(1, 1, 1);
    const wireframe = new three.WireframeGeometry( geometry );
    const mat = new three.LineBasicMaterial( { color: 0x00ccff, linewidth: 2 } );
    const camera = new three.LineSegments( wireframe, mat );
    camera.material.depthTest = false;
    camera.material.transparent = true;

    console.log( `Wireframe scale ${width}, ${height}, ${depth} (ratio ${ratio})` );
    camera.scale.set( width, height, depth );

    camera.position.x = this.position.store.x[eid];
    camera.position.y = this.position.store.y[eid];
    camera.position.z = this.position.store.z[eid];

    this.sceneCameras[eid] = camera;
    this.scene._scene.add( camera );
  }

  remove( eid:number ) {
    this.scene._scene.remove( this.sceneCameras[eid] );
    this.sceneCameras[eid] = null;
  }

  onResize(e:{width:number, height:number}) {
    // Fix camera settings to maintain exact size/aspect
    const { width, height } = e;
    const ratio = width / height;
    const camera = this.camera;
    camera.left = this.frustumSize * (ratio/-2);
    camera.right = this.frustumSize * (ratio/2);
    camera.top = this.frustumSize / 2;
    camera.bottom = this.frustumSize / -2
    camera.updateProjectionMatrix();
    this.render();
    console.log( this.camera );
  }
}
