
import * as three from 'three';
import * as bitecs from 'bitecs';
import Scene from '../../Scene.js';
import System from '../../System.js';
import RenderSystem from '../Render.js';
import Position from '../../component/Position.js';
import OrthographicCameraComponent from '../../component/OrthographicCamera.js';
import { ResizeEvent } from '../../Game.js';

const raycaster = new three.Raycaster();
raycaster.layers.set(1);
const pointer = new three.Vector3();

export default class Render extends RenderSystem {
  camera?:three.OrthographicCamera;

  sceneCameras:Array<three.LineSegments> = [];
  component:OrthographicCameraComponent;
  position:Position;

  query:bitecs.Query;
  cameraEnterQuery:bitecs.Query;
  cameraExitQuery:bitecs.Query;

  frustumSize = 200;
  zoom = 1;

  selected:Array<three.Object3D> = [];
  mouseIsDown:boolean = false;
  mouseMoved:boolean = false;
  moveSelected:boolean = false;
  moveRatio:{x: number, y: number} = {x: 0, y: 0};
  moveObject:three.Object3D|null = null;

  constructor( name:string, scene:Scene ) {
    super(name, scene);

    this.position = scene.getComponent(Position);
    this.component = scene.getComponent(OrthographicCameraComponent);

    this.query = scene.game.ecs.defineQuery([ this.position.store, this.component.store ]);
    this.cameraEnterQuery = scene.game.ecs.enterQuery( this.query );
    this.cameraExitQuery = scene.game.ecs.exitQuery( this.query );

    scene.addEventListener( "resize", (e:three.Event) => {
      this.onResize(e as ResizeEvent);
    });

    // Allow canvas to have keyboard focus
    scene.game.canvas.tabIndex = 1;

    const listeners:{ [key:string]: (e:any) => void } = {
      wheel: this.onWheel.bind(this),
      mousedown: this.onMouseDown.bind(this),
      mouseup: this.onMouseUp.bind(this),
      mousemove: this.onMouseMove.bind(this),
      keydown: this.onKeyDown.bind(this),
    };
    for ( const ev in listeners ) {
      scene.game.input.on( ev, listeners[ev] );
    }
    scene.game.addEventListener( "stop", () => {
      for ( const ev in listeners ) {
        scene.game.input.off( ev, listeners[ev] );
      }
    });

    scene.game.input.watchPointer();
  }

  stop() {
    super.stop();
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
    const position = this.position.store;
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
    const { width, height } = this.scene.game;
    const ratio = width / height;
    // Point a camera at 0, 0
    // Frustum size appears to work the same as zoom for an
    // orthographic camera, which makes sense
    const frustumSize = this.frustumSize;
    const far = 2000;
    const near = 0;
    const camera = new three.OrthographicCamera(
      frustumSize * (ratio/-2),
      frustumSize * (ratio/2),
      frustumSize /2,
      frustumSize /-2,
      near, far,
    );
    camera.zoom = this.zoom;
    // Position the camera so that Sprites can have a maximum Z value of
    // the camera's "far" setting
    camera.position.z = far;
    camera.updateProjectionMatrix();
    return camera;
  }

  add( eid:number ) {
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
    camera.userData.eid = eid;
    camera.material.depthTest = false;
    camera.material.transparent = true;

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
