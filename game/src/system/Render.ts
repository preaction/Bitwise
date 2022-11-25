
import * as three from 'three';
import * as bitecs from 'bitecs';
import System from '../System.js';
import Scene from '../Scene.js';
import PositionComponent from '../component/Position.js';
import SpriteComponent from '../component/Sprite.js';
import OrthographicCameraComponent from '../component/OrthographicCamera.js';
import { ResizeEvent } from '../Game.js';

export default class Render extends System {
  positionComponent:PositionComponent;
  positionQuery:bitecs.Query;
  positionEnterQuery:bitecs.Query;
  positionExitQuery:bitecs.Query;

  cameraComponent:OrthographicCameraComponent;
  cameraQuery:bitecs.Query;

  spriteComponent:SpriteComponent;
  spriteQuery:bitecs.Query;

  cameras:Array<three.OrthographicCamera|undefined> = [];
  mainCamera:number = -1;
  objects:three.Object3D[] = [];
  materials:three.Material[] = [];

  constructor( name:string, scene:Scene ) {
    super(name, scene);

    this.positionComponent = scene.getComponent(PositionComponent);
    this.spriteComponent = scene.getComponent(SpriteComponent);
    this.cameraComponent = scene.getComponent(OrthographicCameraComponent);

    this.positionQuery = scene.game.ecs.defineQuery([ this.positionComponent.store ]);
    this.positionEnterQuery = scene.game.ecs.enterQuery( this.positionQuery );
    this.positionExitQuery = scene.game.ecs.exitQuery( this.positionQuery );

    this.cameraQuery = scene.game.ecs.defineQuery([ this.cameraComponent.store ]);
    this.spriteQuery = scene.game.ecs.defineQuery([ this.spriteComponent.store ]);

    scene.addEventListener( "resize", (e:any) => {
      this.onResize(e as ResizeEvent);
    });
  }

  start() {
    // XXX: We should set this in a System form
    this.mainCamera = this.cameraQuery(this.scene.world)[0];
  }

  /**
   * Get the renderer object for the given entity, if any.
   */
  getRenderObject<T extends three.Object3D>( eid:number ):T|null {
    return this.objects[eid] as T || null;
  }

  update( timeMilli:number ) {
    const spriteEids = this.spriteQuery(this.scene.world);
    const cameraEids = this.cameraQuery(this.scene.world);

    // Objects entering the scene with a Position component
    for ( const eid of this.positionEnterQuery(this.scene.world) ) {
      if ( spriteEids.indexOf(eid) >= 0 ) {
        this.addSprite( eid );
      }
      else if ( cameraEids.indexOf(eid) >= 0 ) {
        this.addCamera( eid );
      }
      else {
        this.addGroup( eid );
      }
    }

    // Objects leaving the scene via their Position component
    for ( const eid of this.positionExitQuery(this.scene.world) ) {
      this.remove( eid );
    }

    // Objects changing their position
    for ( const eid of this.positionQuery( this.scene.world ) ) {
      const obj = this.objects[eid];
      if ( !obj ) {
        continue;
      }
      obj.position.x = this.positionComponent.store.x[eid];
      obj.position.y = this.positionComponent.store.y[eid];
      obj.position.z = this.positionComponent.store.z[eid];
      obj.scale.x = this.positionComponent.store.sx[eid];
      obj.scale.y = this.positionComponent.store.sy[eid];
      obj.scale.z = this.positionComponent.store.sz[eid];
    }

    // Sprites changing their texture
    for ( const eid of spriteEids ) {
      const tid = this.spriteComponent.store.textureId[eid];
      const texture = this.scene.game.textures[tid];
      if ( !this.materials[eid] || (this.materials[eid] as three.SpriteMaterial).map !== texture ) {
        const material = this.materials[eid] = new three.SpriteMaterial( { map: texture } );
        (this.objects[eid] as three.Sprite).material = material;
      }
    }

    // Cameras changing their properties
    for ( const eid of cameraEids ) {
      const camera = this.objects[eid] as three.OrthographicCamera;
      if ( !camera ) {
        continue;
      }
      camera.far = this.cameraComponent.store.far[eid];
      camera.near = this.cameraComponent.store.near[eid];
      camera.zoom = this.cameraComponent.store.zoom[eid];
      camera.updateProjectionMatrix();
    }

  }

  render() {
    // cameraQuery: Update camera properties and render if needed
    const update = this.cameraQuery(this.scene.world);
    for ( const eid of update ) {
      const camera = this.cameras[eid];
      if ( !camera ) {
        continue;
      }
      this.scene.game.renderer.render( this.scene._scene, camera );
    }
  }

  addCamera( eid:number ) {
    const { width, height } = this.scene.game;
    const ratio = width / height;
    // Point a camera at 0, 0
    // Frustum size appears to work the same as zoom for an
    // orthographic camera, which makes sense
    const cameraData = this.cameraComponent.store;
    const frustumSize = cameraData.frustum[eid] || 20;
    const far = cameraData.far[eid] || 2000;
    const near = cameraData.near[eid] || 0;
    const camera = new three.OrthographicCamera(
      frustumSize * (ratio/-2),
      frustumSize * (ratio/2),
      frustumSize /2,
      frustumSize /-2,
      near, far,
    );
    this.cameras[eid] = this.objects[eid] = camera;
    camera.zoom = cameraData.zoom[eid] || 4;

    // XXX: If entity has a parent, add it to that instead
    this.scene._scene.add( camera );
  }

  removeCamera( eid:number ) {
    const camera = this.cameras[eid];
    if ( camera ) {
      this.scene._scene.remove( camera );
      this.cameras[eid] = undefined;
      delete this.objects[eid];
    }
  }

  addGroup( eid:number ) {
    const group = this.objects[eid] = new three.Group();
    // XXX: If entity has a parent, add it to that instead
    this.scene._scene.add( group );
  }

  addSprite( eid:number ) {
    // Find the sprite's texture
    const tid = this.spriteComponent.store.textureId[eid];
    const texture = this.scene.game.textures[tid];
    const material = this.materials[eid] = new three.SpriteMaterial( { map: texture } );
    const sprite = this.objects[eid] = new three.Sprite( material );
    sprite.userData.eid = eid;
    sprite.layers.enable(1);
    // XXX: If entity has a parent, add it to that instead
    this.scene._scene.add( sprite );
  }

  remove( eid:number ) {
    this.scene._scene.remove( this.objects[eid] );
    delete this.objects[eid];
    delete this.materials[eid];
  }

  onResize(e:ResizeEvent) {
    // Fix camera settings to maintain exact size/aspect
    const { width, height } = e;
    const ratio = width / height;
    const update = this.cameraQuery(this.scene.world);
    for ( const eid of update ) {
      const frustumSize = this.cameraComponent.store.frustum[eid];
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
