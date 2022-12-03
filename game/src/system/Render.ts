
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
  textures:three.Texture[] = [];
  materials:three.Material[] = [];
  loader = new three.TextureLoader();

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

  async init():Promise<any> {
    const promises = [];

    // XXX: Should we preload textures like this, or will we load too
    // many textures that we don't later use?
    for ( const path in this.scene.game.load.textureIds ) {
      const textureId = this.scene.game.load.textureIds[path];
      promises.push( this.loadTexture( textureId ) );
    }

    const spriteEids = this.spriteQuery(this.scene.world);
    const cameraEids = this.cameraQuery(this.scene.world);
    for ( const eid of spriteEids ) {
      const textureId = this.spriteComponent.store.textureId[eid];
      promises.push( this.loadTexture( textureId ) );
      this.createSprite( eid );
    }
    for ( const eid of cameraEids ) {
      this.createCamera( eid );
    }

    // XXX: We should set this in a System form
    this.mainCamera = cameraEids[0];
    return Promise.all( promises );
  }

  start() {
    // Add all render objects to the scene
    const spriteEids = this.spriteQuery(this.scene.world);
    const cameraEids = this.cameraQuery(this.scene.world);
    for ( const eid of this.positionQuery(this.scene.world) ) {
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
  }

  stop() {
    // Remove all render objects from the scene
    for ( const eid of this.positionQuery(this.scene.world) ) {
      this.remove( eid );
      if ( this.materials[eid] ) {
        this.materials[eid].dispose();
        delete this.materials[eid];
        if ( this.textures[eid] ) {
          this.textures[eid].dispose();
          delete this.textures[eid];
        }
      }
    }
  }

  /**
   * Get the renderer object for the given entity, if any.
   */
  getRenderObject<T extends three.Object3D>( eid:number ):T|null {
    return this.objects[eid] as T || null;
  }

  /**
   * Load the texture and prepare it to be rendered.
   */
  async loadTexture( textureId:number ):Promise<three.Texture> {
    const path = this.scene.game.load.texturePaths[textureId];
    return new Promise(
      (resolve, reject) => {
        const texture = this.loader.load( path, resolve, undefined, reject ) 
        this.textures[textureId] = texture;
      },
    )
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
      this.updatePosition( eid );
    }

    // Sprites changing their texture
    for ( const eid of spriteEids ) {
      this.updateSprite( eid );
    }

    // Cameras changing their properties
    for ( const eid of cameraEids ) {
      this.updateCamera( eid );
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

  updatePosition( eid:number ) {
    const obj = this.objects[eid];
    if ( !obj ) {
      return;
    }
    obj.position.x = this.positionComponent.store.x[eid];
    obj.position.y = this.positionComponent.store.y[eid];
    obj.position.z = this.positionComponent.store.z[eid];
    obj.scale.x = this.positionComponent.store.sx[eid];
    obj.scale.y = this.positionComponent.store.sy[eid];
    obj.scale.z = this.positionComponent.store.sz[eid];
  }

  createCamera( eid:number ):three.OrthographicCamera {
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
    this.updatePosition( eid );
    this.updateCamera( eid );
    return camera;
  }

  updateCamera( eid:number ) {
    const camera = this.objects[eid] as three.OrthographicCamera;
    if ( !camera ) {
      return;
    }
    camera.far = this.cameraComponent.store.far[eid];
    camera.near = this.cameraComponent.store.near[eid];
    camera.zoom = this.cameraComponent.store.zoom[eid];
    camera.updateProjectionMatrix();
  }

  addCamera( eid:number ) {
    const camera = this.cameras[eid] || this.createCamera(eid);
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

  createGroup( eid:number ):three.Group {
    const group = this.objects[eid] = new three.Group();
    this.updatePosition( eid );
    return group;
  }

  addGroup( eid:number ) {
    const group = this.objects[eid] || this.createGroup( eid );
    // XXX: If entity has a parent, add it to that instead
    this.scene._scene.add( group );
  }

  createSprite( eid:number ):three.Sprite {
    // Find the sprite's texture
    const tid = this.spriteComponent.store.textureId[eid];
    const texture = this.textures[tid];
    const material = this.materials[eid] = new three.SpriteMaterial( { map: texture } );
    const sprite = this.objects[eid] = new three.Sprite( material );
    sprite.userData.eid = eid;
    sprite.layers.enable(1);
    this.updatePosition( eid );
    return sprite;
  }

  updateSprite( eid:number ) {
    const sprite = this.objects[eid] as three.Sprite;
    if ( !sprite ) {
      return;
    }
    const tid = this.spriteComponent.store.textureId[eid];
    let texture = this.textures[tid];
    if ( !texture ) {
      this.loadTexture( tid ).then( () => this.render() );
      texture = this.textures[tid];
    }
    if ( !this.materials[eid] || (this.materials[eid] as three.SpriteMaterial).map !== texture ) {
      const material = this.materials[eid] = new three.SpriteMaterial( { map: texture } );
      sprite.material = material;
    }
  }

  addSprite( eid:number ) {
    const sprite = this.objects[eid] || this.createSprite( eid );
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