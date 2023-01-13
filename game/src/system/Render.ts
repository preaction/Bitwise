
import * as three from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import * as bitecs from 'bitecs';
import System from '../System.js';
import Scene from '../Scene.js';
import TransformComponent from '../component/Transform.js';
import ActiveComponent from '../component/Active.js';
import SpriteComponent from '../component/Sprite.js';
import UIElementComponent from '../component/UIElement.js';
import UIImageComponent from '../component/UIImage.js';
import OrthographicCameraComponent from '../component/OrthographicCamera.js';
import { ResizeEvent } from '../Game.js';

export default class Render extends System {
  transformComponent:TransformComponent;
  transformQuery:bitecs.Query;
  transformEnterQuery:bitecs.Query;
  transformExitQuery:bitecs.Query;

  uiElementComponent:UIElementComponent;
  uiImageComponent:UIImageComponent;
  uiQuery:bitecs.Query;
  uiEnterQuery:bitecs.Query;
  uiExitQuery:bitecs.Query;
  uiElements:CSS3DObject[] = [];

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

    // Set up loaders
    three.Cache.enabled = true;
    three.DefaultLoadingManager.setURLModifier(
      url => {
        // Let full URLs pass through unharmed
        if ( url.match( /^[a-zA-Z]+:/ ) ) {
          return url;
        }
        return this.scene.game.load.base + url
      },
    );

    this.transformComponent = scene.getComponent(TransformComponent);
    this.spriteComponent = scene.getComponent(SpriteComponent);
    this.cameraComponent = scene.getComponent(OrthographicCameraComponent);
    this.uiElementComponent = scene.getComponent(UIElementComponent);
    this.uiImageComponent = scene.getComponent(UIImageComponent);

    const activeComponent = scene.getComponent(ActiveComponent);
    this.transformQuery = scene.game.ecs.defineQuery([ this.transformComponent.store, activeComponent.store ]);
    this.transformEnterQuery = scene.game.ecs.enterQuery( this.transformQuery );
    this.transformExitQuery = scene.game.ecs.exitQuery( this.transformQuery );

    this.uiQuery = scene.game.ecs.defineQuery([ this.uiElementComponent.store, activeComponent.store ]);
    this.uiEnterQuery = scene.game.ecs.enterQuery( this.uiQuery );
    this.uiExitQuery = scene.game.ecs.exitQuery( this.uiQuery );

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
      promises.push( this.loadTexture( textureId, eid ) );
      this.createSprite( eid );
    }
    for ( const eid of cameraEids ) {
      this.createCamera( eid );
    }

    // Pre-create UI elements
    for ( const eid of this.uiQuery(this.scene.world) ) {
      this.createUIElement( eid );
    }

    // XXX: We should set this in a System form
    this.mainCamera = cameraEids[0];
    return Promise.all( promises );
  }

  start() {
    // Add all render objects to the scene
    const spriteEids = this.spriteQuery(this.scene.world);
    const cameraEids = this.cameraQuery(this.scene.world);
    for ( const eid of this.transformEnterQuery(this.scene.world) ) {
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
    // Add UI objects to UI scene
    for ( const eid of this.uiEnterQuery(this.scene.world) ) {
      this.addUIElement( eid );
    }
  }

  createUIElement( eid:number ):CSS3DObject {
    // XXX: Look up element to create by which components are on the
    // element?
    const node = document.createElement( 'div' );
    node.dataset.eid = eid.toString();

    const element = new CSS3DObject( node );
    this.objects[eid] = this.uiElements[eid] = element;

    this.updateTransform( eid );
    this.updateUIElement( eid );

    return element;
  }

  addUIElement( eid:number ) {
    const element = this.uiElements[eid] ||= this.createUIElement(eid);
    this.scene._uiScene.add( element );
  }

  updateUIElement( eid:number ) {
    const node = this.uiElements[eid].element;
    node.style.backgroundColor = '#' + this.uiElementComponent.store.backgroundColor[eid].toString(16).padStart(8, '0');
    const imageId = this.uiImageComponent.store.imageId[eid];
    if ( imageId ) {
      let img = node.querySelector('img');
      if ( !img ) {
        img = document.createElement( 'img' );
        node.appendChild( img );
      }
      if ( img.dataset.imageId != imageId.toString() ) {
        img.src = this.scene.game.load.base + this.scene.game.load.texturePaths[imageId];
        img.dataset.imageId = imageId.toString();
      }
    }
  }

  stop() {
    // Remove all render objects from the scene
    for ( const eid of this.transformQuery(this.scene.world) ) {
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
   * Get the UI element object for the given entity, if any.
   */
  getUIElement( eid:number ):HTMLElement|null {
    return this.uiElements[eid]?.element || null;
  }


  /**
   * Load the texture and prepare it to be rendered.
   */
  async loadTexture( textureId:number, forEid:string|number="preload" ):Promise<three.Texture> {
    const path = this.scene.game.load.texturePaths[textureId];
    if ( !path ) {
      throw `Unknown texture ID ${textureId} (${forEid})`;
    }
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

    // Objects entering the scene with a Transform component
    for ( const eid of this.transformEnterQuery(this.scene.world) ) {
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

    // Objects leaving the scene via their Transform component
    for ( const eid of this.transformExitQuery(this.scene.world) ) {
      this.remove( eid );
    }

    // Objects changing their transform
    for ( const eid of this.transformQuery( this.scene.world ) ) {
      this.updateTransform( eid );
    }

    // Sprites changing their texture
    for ( const eid of spriteEids ) {
      this.updateSprite( eid );
    }

    // Cameras changing their properties
    for ( const eid of cameraEids ) {
      this.updateCamera( eid );
    }

    // UI elements entering the scene
    for ( const eid of this.uiEnterQuery(this.scene.world) ) {
      this.addUIElement( eid );
    }

    // UI elements leaving the scene
    for ( const eid of this.uiExitQuery(this.scene.world) ) {
      this.remove( eid );
    }

    for ( const eid of this.uiQuery(this.scene.world) ) {
      this.updateUIElement(eid);
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
      this.scene.game.ui.renderer.render( this.scene._uiScene, camera );
    }
  }

  updateTransform( eid:number ) {
    const obj = this.objects[eid];
    if ( !obj ) {
      return;
    }
    obj.position.x = this.transformComponent.store.x[eid];
    obj.position.y = this.transformComponent.store.y[eid];
    obj.position.z = this.transformComponent.store.z[eid];
    // obj.rotation.x = this.transformComponent.store.rx[eid];
    // obj.rotation.y = this.transformComponent.store.ry[eid];
    // obj.rotation.z = this.transformComponent.store.rz[eid];
    obj.scale.x = this.transformComponent.store.sx[eid];
    obj.scale.y = this.transformComponent.store.sy[eid];
    obj.scale.z = this.transformComponent.store.sz[eid];
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
    this.updateTransform( eid );
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
    const entity = this.scene.getEntityById( eid );
    const parent = entity.parent;
    if ( parent ){
      this.objects[parent.id].add( camera );
    }
    else {
      this.scene._scene.add( camera );
    }
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
    this.updateTransform( eid );
    return group;
  }

  addGroup( eid:number ) {
    const group = this.objects[eid] || this.createGroup( eid );
    const entity = this.scene.getEntityById( eid );
    const parent = entity.parent;
    if ( parent ){
      this.objects[parent.id].add( group );
    }
    else {
      this.scene._scene.add( group );
    }
  }

  createSprite( eid:number ):three.Sprite {
    // Find the sprite's texture
    const tid = this.spriteComponent.store.textureId[eid];
    let texture = this.textures[tid];
    if ( !texture ) {
      this.loadTexture( tid, eid ).then( () => this.render() );
      texture = this.textures[tid];
    }
    const material = this.materials[eid] = new three.SpriteMaterial( { map: texture } );
    const sprite = this.objects[eid] = new three.Sprite( material );
    sprite.userData.eid = eid;
    sprite.layers.enable(1);
    this.updateTransform( eid );
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
      this.loadTexture( tid, eid ).then( () => this.render() );
      texture = this.textures[tid];
    }
    if ( !this.materials[eid] || (this.materials[eid] as three.SpriteMaterial).map !== texture ) {
      const material = this.materials[eid] = new three.SpriteMaterial( { map: texture } );
      sprite.material = material;
    }
  }

  addSprite( eid:number ) {
    const sprite = this.objects[eid] || this.createSprite( eid );
    const entity = this.scene.getEntityById( eid );
    const parent = entity.parent;
    if ( parent ){
      this.objects[parent.id].add( sprite );
    }
    else {
      this.scene._scene.add( sprite );
    }
  }

  remove( eid:number ) {
    this.scene._scene.remove( this.objects[eid] );
    this.scene._uiScene.remove( this.objects[eid] );
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
