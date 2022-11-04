
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from '../../Scene.js';
import System from '../../System.js';
import Position from '../../component/Position.js';
import OrthographicCameraComponent from '../../component/OrthographicCamera.js';
import { ResizeEvent } from '../../Game.js';

const raycaster = new three.Raycaster();
raycaster.layers.set(1);
const pointer = new three.Vector2();

export default class Render extends System {
  camera?:three.OrthographicCamera;

  sceneCameras:Array<three.LineSegments> = [];
  component:OrthographicCameraComponent;
  position:Position;

  query:bitecs.Query;
  enterQuery:bitecs.Query;
  exitQuery:bitecs.Query;

  constructor( name:string, scene:Scene ) {
    super(name, scene);

    this.position = scene.getComponent(Position);
    this.component = scene.getComponent(OrthographicCameraComponent);

    this.query = scene.game.ecs.defineQuery([ this.position.store, this.component.store ]);
    this.enterQuery = scene.game.ecs.enterQuery( this.query );
    this.exitQuery = scene.game.ecs.exitQuery( this.query );

    scene.addEventListener( "resize", (e:three.Event) => {
      this.onResize(e as ResizeEvent);
    });

    const listeners:{ [key:string]: (e:any) => void } = {
      wheel: this.onWheel.bind(this),
      mousedown: this.onMouseDown.bind(this),
      mouseup: this.onMouseUp.bind(this),
      mousemove: this.onMouseMove.bind(this),
    };
    for ( const ev in listeners ) {
      scene.game.input.on( ev, listeners[ev] );
    }
    scene.game.addEventListener( "stop", () => {
      for ( const ev in listeners ) {
        scene.game.input.off( ev, listeners[ev] );
      }
    });
  }

  stop() {
    this.scene.game.input.removeEventListener( 'wheel' );
    this.scene.game.input.removeEventListener( 'mousedown' );
    this.scene.game.input.removeEventListener( 'mouseup' );
    this.scene.game.input.removeEventListener( 'mousemove' );
  }

  onWheel( event:WheelEvent ) {
    event.preventDefault();
    if ( !this.camera ) {
      return;
    }

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
  mouseMoved:boolean = false;
  onMouseDown( event:MouseEvent ) {
    event.preventDefault();
    this.mouseMoved = false;
    this.mouseIsDown = true;
    // XXX: Mouse down outside selected element de-selects
  }

  selected:Array<three.Object3D> = [];

  onMouseUp( event:MouseEvent ) {
    if ( !this.camera ) {
      return;
    }
    event.preventDefault();
    this.mouseIsDown = false;
    // Mouse up without moving selects element
    if ( !this.mouseMoved ) {
      const canvas = this.scene.game.canvas;
      const scene = this.scene._scene;
      pointer.x = ( event.offsetX / canvas.clientWidth ) * 2 - 1;
      pointer.y = - ( event.offsetY / canvas.clientHeight ) * 2 + 1;

      raycaster.setFromCamera( pointer, this.camera );
      const intersects = raycaster.intersectObjects( scene.children, true );

      if ( intersects.length > 0 ) {
        const selected = intersects[0].object;
        if ( this.selected.length === 1 && this.selected.find( obj => obj.userData.selected === selected ) ) {
          this.deselectObject( selected );
        }
        else {
          // Do not clear if shift is pressed
          if ( !event.shiftKey ) {
            this.clearSelected();
          }
          this.selectObject( selected );
        }
      }
      else if ( !event.shiftKey ) {
        this.clearSelected();
      }

      this.scene.update(0);
      this.scene.render();
    }
  }

  clearSelected() {
    while ( this.selected.length ) {
      const box = this.selected.pop();
      if ( !box ) { break; }
      box.removeFromParent();
    }
  }

  selectObject( obj:three.Object3D ) {
    const geometry = new three.BoxGeometry( obj.scale.x*1.2, obj.scale.y*1.2, obj.scale.z*1.2 );
    const edges = new three.EdgesGeometry( geometry );
    const line = new three.LineSegments( edges, new three.LineDashedMaterial( { color: 0xffffff, dashSize: 0.2, gapSize: 0.1 } ) );
    line.position.add( obj.position );
    line.userData.selected = obj;
    this.scene._scene.add( line );
    this.selected.push(line);

    // Emit select event so editor can select the entity, too
    this.dispatchEvent({ type: "select", object: obj });
  }

  deselectObject( selected:three.Object3D ) {
    const i = this.selected.findIndex( obj => obj.userData.selected === selected );
    this.scene._scene.remove( this.selected[i] );
    this.selected.splice( i, 1 );
  }

  onMouseMove( event:MouseEvent ) {
    event.preventDefault();
    if ( !this.camera ) {
      return;
    }
    // XXX: Mouse move with object selected moves object
    // XXX: Mouse move with button down moves camera
    if ( this.mouseIsDown ) {
      // Allow a bare bit of movement
      this.mouseMoved = 1 < Math.abs(event.movementX) + Math.abs(event.movementY);
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
      this.scene._scene.remove( this.sceneCameras[eid] );
      delete this.sceneCameras[eid];
    }

    // cameraQuery: Update camera properties and render if needed
    const update = this.query(this.scene.world);
    for ( const eid of update ) {
      // XXX: Object3d should be its own component somehow
      const camera = this.sceneCameras[eid];
      if ( !camera ) {
        continue;
      }

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
      camera.scale.set( width, height, depth );
    }
  }

  render() {
    if ( !this.camera ) {
      this.camera = this.createCamera();
    }
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
    const camera = this.sceneCameras[eid];
    if ( camera ) {
      this.scene._scene.remove( camera );
      delete this.sceneCameras[eid];
    }
  }

  onResize(e:ResizeEvent) {
    // Fix camera settings to maintain exact size/aspect
    const { width, height } = e;
    const ratio = width / height;
    const camera = this.camera;
    if ( !camera ) {
      return;
    }
    camera.left = this.frustumSize * (ratio/-2);
    camera.right = this.frustumSize * (ratio/2);
    camera.top = this.frustumSize / 2;
    camera.bottom = this.frustumSize / -2
    camera.updateProjectionMatrix();
    this.render();
  }
}
