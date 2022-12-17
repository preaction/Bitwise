
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from '../../Scene.js';
import RenderSystem from '../Render.js';
import Position from '../../component/Position.js';
import OrthographicCameraComponent from '../../component/OrthographicCamera.js';
import { ResizeEvent } from '../../Game.js';

const raycaster = new three.Raycaster();
raycaster.layers.set(1);
const pointer = new three.Vector3();

/**
 * The Editor Render class renders the scene like the regular Render
 * class. Additionally, the Editor Render class shows the boundaries of
 * all cameras in the scene.
 *
 * Most importantly, the Editor Render class adds input handlers to
 * allow manipulating the scene:
 *
 * * Scroll wheel to zoom in and out.
 * * Click and drag the scene to move the view.
 * * Click to select objects. Selected objects may be dragged or moved
 *   with the arrow keys.
 *
 */
export default class Render extends RenderSystem {
  /**
   * The camera showing the scene for editing. This is not a camera that
   * is added to the scene being edited.
   */
  camera!:three.OrthographicCamera;

  /**
   * The rendered frustum boxes for the cameras in the scene.
   */
  sceneCameras:Array<three.LineSegments> = [];

  positionComponent:Position;
  cameraComponent:OrthographicCameraComponent;
  cameraQuery:bitecs.Query;
  cameraEnterQuery:bitecs.Query;
  cameraExitQuery:bitecs.Query;

  /**
   * How many units the camera should display, at minimum. Height/width
   * of the camera will be set by multiplying this value with the aspect
   * ratio to ensure no distortion
   */
  frustumSize:number = 200;

  /**
   * The current zoom level. Can be modified by scroll wheel.
   */
  zoom = 1;

  selected:Array<three.Object3D> = [];
  mouseIsDown:boolean = false;
  mouseMoved:boolean = false;
  moveSelected:boolean = false;
  moveRatio:{x: number, y: number} = {x: 0, y: 0};
  moveObject:three.Object3D|null = null;

  listeners:{ [key:string]: (e:any) => void } = {};

  constructor( name:string, scene:Scene ) {
    super(name, scene);

    this.positionComponent = scene.getComponent(Position);
    this.cameraComponent = scene.getComponent(OrthographicCameraComponent);

    this.cameraQuery = scene.game.ecs.defineQuery([ this.positionComponent.store, this.cameraComponent.store ]);
    this.cameraEnterQuery = scene.game.ecs.enterQuery( this.cameraQuery );
    this.cameraExitQuery = scene.game.ecs.exitQuery( this.cameraQuery );

    // Allow canvas to have keyboard focus
    scene.game.canvas.tabIndex = 1;

    this.listeners = {
      wheel: this.onWheel.bind(this),
      mousedown: this.onMouseDown.bind(this),
      mouseup: this.onMouseUp.bind(this),
      mousemove: this.onMouseMove.bind(this),
      keydown: this.onKeyDown.bind(this),
    };
  }

  start() {
    this.scene.addEventListener( "resize", (e:three.Event) => {
      this.onResize(e as ResizeEvent);
    });
    for ( const ev in this.listeners ) {
      this.scene.game.input.on( ev, this.listeners[ev] );
    }
    this.scene.game.input.watchPointer();
  }

  stop() {
    super.stop();
    for ( const ev in this.listeners ) {
      this.scene.game.input.off( ev, this.listeners[ev] );
    }
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

  onMouseDown( event:MouseEvent ) {
    if ( !this.camera ) {
      return;
    }
    this.mouseMoved = false;
    this.mouseIsDown = true;

    // Mouse down on a selected entity means we're moving it
    const canvas = this.scene.game.canvas;
    const scene = this.scene._scene;
    pointer.x = ( event.offsetX / canvas.clientWidth ) * 2 - 1;
    pointer.y = - ( event.offsetY / canvas.clientHeight ) * 2 + 1;

    raycaster.setFromCamera( pointer, this.camera );
    const intersects = raycaster.intersectObjects( scene.children, true );

    if ( intersects.length > 0 ) {
      const selected = intersects[0].object;
      const ray = intersects[0].point;
      if ( this.selected.find( obj => obj.userData.selected === selected ) ) {
        const camera = this.camera;
        this.moveSelected = true;
        this.moveObject = selected;
        // XXX: This always moves the object center to the mouse
        // position. We need to find the offset onMouseDown.
      }
    }
  }

  onMouseUp( event:MouseEvent ) {
    if ( !this.camera ) {
      return;
    }
    this.mouseIsDown = false;
    this.moveSelected = false;
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
    else if ( this.moveSelected ) {
      this.dispatchEvent({ type: "update" });
    }
  }

  onKeyDown( event:KeyboardEvent ) {
    if ( !this.camera || this.selected.length <= 0 ) {
      return;
    }

    const height = (this.camera.top - this.camera.bottom) / this.camera.zoom;
    const width = (this.camera.left - this.camera.right) / this.camera.zoom;
    let nudge = 0, dir:"x"|"y"|"" = '';

    switch ( event.key ) {
      case "ArrowUp":
        nudge = event.shiftKey ? height/10 : event.altKey ? height/1000 : height/100;
        dir = 'y';
        break;
      case "ArrowDown":
        nudge = event.shiftKey ? -height/10 : event.altKey ? -height/1000 : -height/100;
        dir = 'y';
        break;
      case "ArrowLeft":
        nudge = event.shiftKey ? width/10 : event.altKey ? width/1000 : width/100;
        dir = 'x';
        break;
      case "ArrowRight":
        nudge = event.shiftKey ? -width/10 : event.altKey ? -width/1000 : -width/100;
        dir = 'x';
        break;
    }

    if ( !dir ) {
      return;
    }

    this.nudgeSelected({ [dir]: nudge });
    this.dispatchEvent({ type: "update" });
  }

  nudgeSelected({ x, y }:{x?:number, y?:number}) {
    const position = this.positionComponent.store;
    for ( const obj of this.selected ) {
      obj.position.x += x || 0;
      obj.position.y += y || 0;
      const eid = obj.userData.eid;
      position.x[eid] += x || 0;
      position.y[eid] += y || 0;
    }
    this.scene.update(0);
    this.scene.render();
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
    line.userData.eid = obj.userData.eid;
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

  getSelectedEntityIds():number[] {
    return this.selected.map( obj => obj.userData.eid );
  }

  onMouseMove( event:MouseEvent ) {
    if ( !this.camera ) {
      return;
    }
    // XXX: Mouse move with object selected moves object
    // XXX: Mouse move with button down moves camera
    if ( this.mouseIsDown ) {
      // Allow a bare bit of movement
      this.mouseMoved ||= 1 < Math.abs(event.movementX) + Math.abs(event.movementY);
      if ( this.moveSelected && this.moveObject ) {
        const canvas = this.scene.game.canvas;
        const scene = this.scene._scene;
        pointer.x = ( event.offsetX / canvas.clientWidth ) * 2 - 1;
        pointer.y = - ( event.offsetY / canvas.clientHeight ) * 2 + 1;
        pointer.unproject( this.camera );
        // XXX: This always moves the object center to the mouse
        // position. We need to find the offset onMouseDown.
        this.nudgeSelected({ x: pointer.x-this.moveObject.position.x, y: pointer.y-this.moveObject.position.y });
      }
      else {
        this.camera.position.x -= event.movementX / this.camera.zoom / 2.5;
        this.camera.position.y += event.movementY / this.camera.zoom / 2.5;
      }
      this.render();
    }
  }

  update( timeMilli:number ) {
    super.update(timeMilli);

    // enteredQuery for cameraQuery: Create Camera and add to Scene
    const add = this.cameraEnterQuery(this.scene.world);
    for ( const eid of add ) {
      this.add( eid );
    }

    // exitedQuery for cameraQuery: Remove Camera from Scene
    const remove = this.cameraExitQuery(this.scene.world);
    for ( const eid of remove ) {
      this.scene._scene.remove( this.sceneCameras[eid] );
      delete this.sceneCameras[eid];
    }

    // cameraQuery: Update camera properties and render if needed
    const update = this.cameraQuery(this.scene.world);
    for ( const eid of update ) {
      // XXX: Object3d should be its own component somehow
      const camera = this.sceneCameras[eid];
      if ( !camera ) {
        continue;
      }

      camera.position.x = this.positionComponent.store.x[eid];
      camera.position.y = this.positionComponent.store.y[eid];
      camera.position.z = this.positionComponent.store.z[eid];

      // Update wireframe width/height/depth
      // It's not the current game we want, we want the player game
      // size
      const { gameWidth, gameHeight } = this.scene.game.data;
      const ratio = gameWidth / gameHeight;

      const frustumSize = this.cameraComponent.store.frustum[eid] || 20;
      const width = frustumSize * ratio;
      const height = frustumSize;
      const far = this.cameraComponent.store.far[eid];
      const near = this.cameraComponent.store.near[eid];
      const depth = far - near;
      camera.scale.set( width, height, depth );
    }
  }

  render() {
    if ( !this.camera ) {
      this.camera = this.createCamera();
    }
    this.scene.game.renderer.render( this.scene._scene, this.camera );
  }

  createCamera() {
    // Maintain a constant aspect ratio so shapes don't get distorted
    const { width, height } = this.scene.game;
    const ratio = width / height;

    // Find the boundary of the scene so we can show everything to start
    // XXX: If the scene has a main camera, make our boundary be that
    // + a bit of margin.
    // XXX: After above, show scrollbars for the scene to demonstrate there is more
    // to see
    const bounds = new three.Box3();
    this.scene._scene.traverseVisible( (obj) => {
      bounds.expandByObject(obj);
    });
    const boxSize = bounds.getSize(new three.Vector3());
    const frustumSize = this.frustumSize = Math.max( boxSize.x, boxSize.y, 10 );

    const far = 4000;
    const near = 0;
    const camera = new three.OrthographicCamera(
      frustumSize * (ratio/-2),
      frustumSize * (ratio/2),
      frustumSize /2,
      frustumSize /-2,
      near, far,
    );
    // Position the camera so that Sprites can have positive and
    // negative Z values
    camera.position.z = far/2;

    camera.zoom = this.zoom;
    camera.updateProjectionMatrix();

    return camera;
  }

  add( eid:number ) {
    const { gameWidth, gameHeight } = this.scene.game.data;
    const ratio = gameWidth / gameHeight;

    const frustumSize = this.cameraComponent.store.frustum[eid] || 20;
    const width = frustumSize * ratio;
    const height = frustumSize;
    const far = this.cameraComponent.store.far[eid];
    const near = this.cameraComponent.store.near[eid];
    const depth = far - near;

    const geometry = new three.BoxGeometry(1, 1, 1);
    const wireframe = new three.WireframeGeometry( geometry );
    const mat = new three.LineBasicMaterial( { color: 0x00ccff, linewidth: 2 } );
    const camera = new three.LineSegments( wireframe, mat );
    camera.userData.eid = eid;
    camera.material.depthTest = false;
    camera.material.transparent = true;

    camera.scale.set( width, height, depth );

    camera.position.x = this.positionComponent.store.x[eid];
    camera.position.y = this.positionComponent.store.y[eid];
    camera.position.z = this.positionComponent.store.z[eid];

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
