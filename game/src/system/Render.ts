
import * as three from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import * as bitecs from 'bitecs';
import System, { SystemEvents } from '../System.js';
import Scene from '../Scene.js';
import TransformComponent from '../component/Transform.js';
import ActiveComponent from '../component/Active.js';
import SpriteComponent from '../component/Sprite.js';
import UIElementComponent from '../component/UIElement.js';
import UIImageComponent from '../component/UIImage.js';
import UITextComponent from '../component/UIText.js';
import UIButtonComponent from '../component/UIButton.js';
import UIContainerComponent from '../component/UIContainer.js';
import OrthographicCameraComponent from '../component/OrthographicCamera.js';
import ResizeEvent from '../event/ResizeEvent.js';
import ProgressEvent from '../event/ProgressEvent.js';
import Texture from '../Texture.js';

/**
 * The Render class handles rendering most Three.JS Object3D objects.
 *
 * This classes uses the following components:
 *
 * * TransformComponent
 * * SpriteComponent
 * * OrthographicCameraComponent
 */
export default class Render extends System {
  activeComponent: ActiveComponent;
  activeQuery: bitecs.Query;
  activeEnterQuery: bitecs.Query;
  activeExitQuery: bitecs.Query;

  transformComponent: TransformComponent;
  transformQuery: bitecs.Query;
  transformEnterQuery: bitecs.Query;
  transformExitQuery: bitecs.Query;

  uiElementComponent: UIElementComponent;
  uiImageComponent: UIImageComponent;
  uiTextComponent: UITextComponent;
  uiButtonComponent: UIButtonComponent;
  uiContainerComponent: UIContainerComponent;
  uiQuery: bitecs.Query;
  uiEnterQuery: bitecs.Query;
  uiExitQuery: bitecs.Query;
  uiElements: CSS3DObject[] = [];
  uiNodes: HTMLDivElement[] = [];

  cameraComponent: OrthographicCameraComponent;
  cameraQuery: bitecs.Query;
  cameraEnterQuery: bitecs.Query;
  cameraExitQuery: bitecs.Query;

  spriteComponent: SpriteComponent;
  spriteQuery: bitecs.Query;
  spriteEnterQuery: bitecs.Query;
  spriteExitQuery: bitecs.Query;

  cameras: Array<three.OrthographicCamera | undefined> = [];
  mainCamera: number = -1;
  ambientLight: three.Light;
  objects: three.Object3D[] = [];
  textures: three.Texture[] = [];
  materials: three.Material[] = [];
  sources: { [key: string]: Promise<three.Texture> | three.Source } = {};
  loader = new three.TextureLoader();

  /**
   * The current load progress during init().
   */
  private progress: ProgressEvent = new ProgressEvent();

  /**
   */
  constructor(name: string, scene: Scene) {
    super(name, scene);

    // Set up loaders
    three.Cache.enabled = true;
    three.DefaultLoadingManager.setURLModifier(
      url => {
        // Let full URLs pass through unharmed
        if (url.match(/^[a-zA-Z]+:/)) {
          return url;
        }
        return this.scene.game.load.base + url
      },
    );

    // XXX: This should be an Entity/Component
    this.ambientLight = new three.AmbientLight(0xffffff, Math.PI);
    this.ambientLight.name = 'ambientLight';

    // Render currently has Sprite and OrthographicCamera
    // At init(), we want to create all Object3D
    // At start(), we want to add all Active Object3D
    // At update(), we want to update all Active Object3D

    this.activeComponent = scene.getComponent(ActiveComponent);
    this.activeQuery = this.defineQuery([this.activeComponent]);
    this.activeEnterQuery = this.enterQuery(this.activeQuery);
    this.activeExitQuery = this.exitQuery(this.activeQuery);

    this.transformComponent = scene.getComponent(TransformComponent);
    this.transformQuery = this.defineQuery([this.transformComponent]);
    this.transformEnterQuery = this.enterQuery(this.transformQuery);
    this.transformExitQuery = this.exitQuery(this.transformQuery);

    this.cameraComponent = scene.getComponent(OrthographicCameraComponent);
    this.cameraQuery = this.defineQuery([this.cameraComponent]);
    this.cameraEnterQuery = this.enterQuery(this.cameraQuery);
    this.cameraExitQuery = this.exitQuery(this.cameraQuery);

    this.spriteComponent = scene.getComponent(SpriteComponent);
    this.spriteQuery = this.defineQuery([this.spriteComponent]);
    this.spriteEnterQuery = this.enterQuery(this.spriteQuery);
    this.spriteExitQuery = this.exitQuery(this.spriteQuery);

    this.uiElementComponent = scene.getComponent(UIElementComponent);
    this.uiImageComponent = scene.getComponent(UIImageComponent);
    this.uiTextComponent = scene.getComponent(UITextComponent);
    this.uiButtonComponent = scene.getComponent(UIButtonComponent);
    this.uiContainerComponent = scene.getComponent(UIContainerComponent);
    this.uiQuery = this.defineQuery([this.uiElementComponent]);
    this.uiEnterQuery = this.enterQuery(this.uiQuery);
    this.uiExitQuery = this.exitQuery(this.uiQuery);

    scene.addEventListener("resize", (e: any) => {
      this.onResize(e as ResizeEvent);
    });
  }

  /**
   * Initialize the renderer by creating all of the Object3D in the
   * scene and loading all external resources (like textures).
   */
  init(): Promise<any> {
    const promise = this.createEnters();
    // XXX: This should be a System setting.
    this.mainCamera = this.cameras.findIndex(c => !!c);
    return promise;
  }

  /**
   * This creates all the Object3D entering the scene. It does not add
   * anything to the scene.
   */
  private createEnters(): Promise<any> {
    const promises = [];
    const spriteEids = this.spriteEnterQuery(this.scene.world);
    for (const eid of spriteEids) {
      const textureId = this.spriteComponent.store.textureId[eid];
      promises.push(this.loadTexture(textureId, eid));
      this.createSprite(eid);
    }
    const cameraEids = this.cameraEnterQuery(this.scene.world);
    for (const eid of cameraEids) {
      this.createCamera(eid);
    }
    const elementEids = this.uiEnterQuery(this.scene.world);
    for (const eid of elementEids) {
      this.createUINode(eid);
    }

    // Fire first progress event to establish baseline
    this.dispatchEvent(this.progress);

    return Promise.all(promises);
  }

  /**
   * Thie adds any newly-active objects, creating blank objects if
   * necessary.
   */
  private addNewActive(): void {
    const activeEnterEids = this.activeEnterQuery(this.scene.world);
    for (const eid of activeEnterEids) {
      if (this.uiNodes[eid]) {
        this.addUINode(eid);
        continue;
      }
      let renderObject = this.objects[eid];
      if (!renderObject) {
        renderObject = this.createGroup(eid);
      }
      const entity = this.scene.getEntityById(eid);
      const parentEntity = entity.parent;
      if (parentEntity) {
        let parentRenderObject = this.objects[parentEntity.id];
        if (!parentRenderObject) {
          parentRenderObject = this.objects[parentEntity.id] = this.createGroup(parentEntity.id);
        }
        this.objects[parentEntity.id].add(renderObject);
      }
      else {
        this.scene._scene.add(renderObject);
      }
    }
  }

  /**
   * This removes any objects that have become inactive.
   */
  private removeInactive(): void {
    const activeExitEids = this.activeExitQuery(this.scene.world);
    for (const eid of activeExitEids) {
      const renderObject = this.objects[eid];
      if (renderObject) {
        renderObject.removeFromParent();
      }
      const uiNode = this.uiNodes[eid];
      if (uiNode) {
        uiNode.remove();
      }
    }
  }

  /**
   * Updates the transforms for all objects, active or not.
   */
  private updateTransforms() {
    const transformEids = this.transformQuery(this.scene.world);
    for (const eid of transformEids) {
      this.updateTransform(eid);
    }
  }

  /**
   * Start the scene by adding all the active entities and creating
   * event listeners.
   */
  start() {
    this.scene._scene.add(this.ambientLight);
    this.createEnters();
    this.updateTransforms();
    this.addNewActive();
    this.removeInactive();
    this.startActionListener();
  }

  createUINode(eid: number): HTMLDivElement {
    // XXX: Look up element to create by which components are on the
    // element?
    const node = document.createElement('div');
    node.dataset.eid = eid.toString();
    this.uiNodes[eid] = node;

    this.updateUINode(eid);

    return node;
  }

  addUINode(eid: number) {
    const node = this.uiNodes[eid] ||= this.createUINode(eid);
    const entity = this.scene.getEntityById(eid);
    const parent = entity.parent;
    console.log(`addUINode parent`, entity.parent);
    if (parent && this.uiNodes[parent.id]) {
      this.uiNodes[parent.id].appendChild(node);
    }
    else {
      // We need this wrapper when using the CSS3DObject because the
      // CSS3DRenderer controls a lot of CSS on the element, including
      // "display", which we want to manage ourselves.
      const wrapper = document.createElement('div');
      const element = new CSS3DObject(wrapper);
      wrapper.appendChild(node);
      this.objects[eid] = this.uiElements[eid] = element;
      this.updateTransform(eid);
      if (parent) {
        this.objects[parent.id].add(element);
      }
      else {
        this.scene._uiScene.add(element);
      }
    }
  }

  updateUINode(eid: number) {
    const uiElementComponent = this.uiElementComponent;
    const uiElementData = uiElementComponent.store;
    const node = this.uiNodes[eid];
    node.style.backgroundColor = '#' + uiElementData.backgroundColor[eid].toString(16).padStart(8, '0');
    const width = uiElementComponent.width[eid];
    if (width) {
      node.style.width = width;
    }
    else {
      node.style.width = '';
    }
    const height = uiElementComponent.height[eid];
    if (height) {
      node.style.height = height;
    }
    else {
      node.style.height = '';
    }
    const borderStyle = uiElementComponent.borderStyle[eid];
    if (borderStyle) {
      node.style.borderStyle = borderStyle;
    }
    else {
      node.style.borderStyle = '';
    }
    const borderWidth = uiElementComponent.borderWidth[eid];
    if (borderWidth) {
      node.style.borderWidth = borderWidth;
    }
    else {
      node.style.borderWidth = '';
    }
    const borderColor = uiElementComponent.borderColor[eid];
    if (borderColor) {
      node.style.borderColor = borderColor;
    }
    else {
      node.style.borderColor = '';
    }
    const borderRadius = uiElementComponent.borderRadius[eid];
    if (borderRadius) {
      node.style.borderRadius = borderRadius;
    }
    else {
      node.style.borderRadius = '';
    }
    const margin = uiElementComponent.margin[eid];
    if (margin) {
      node.style.margin = margin;
    }
    else {
      node.style.margin = '';
    }
    const padding = uiElementComponent.padding[eid];
    if (padding) {
      node.style.padding = padding;
    }
    else {
      node.style.padding = '';
    }
    const imageId = this.uiImageComponent.store.imageId[eid];
    if (imageId) {
      let img = node.querySelector('img');
      if (!img) {
        // Add an invisible image to take up the necessary room absent
        // an explicit width/height
        img = document.createElement('img');
        img.style.visibility = 'hidden';
        img.style.display = 'block';
        node.appendChild(img);
      }
      if (img.dataset.imageId != imageId.toString()) {
        img.src = Texture.getById(imageId).src;
        img.dataset.imageId = imageId.toString();
        node.style.backgroundImage = `url(${img.src}`;
        const fillType = this.uiImageComponent.fill[eid];
        if (fillType === 'stretch') {
          node.style.backgroundSize = '100% 100%';
        }
        else {
          node.style.backgroundRepeat = fillType;
        }
      }
    }

    const text = this.uiTextComponent.text[eid];
    if (text) {
      const align = this.uiTextComponent.align[eid];
      node.style.textAlign = align === "end" ? "right" : align === "center" ? "center" : "left";
      let span = node.querySelector('span');
      if (!span) {
        span = document.createElement('span');
        // XXX: Allow color in UIText component
        span.style.color = 'white';
        node.appendChild(span);
      }
      if (span.innerText != text) {
        span.innerText = text;
      }
    }

    const flow = this.uiContainerComponent.flow[eid];
    if (flow) {
      node.style.display = 'flex';
      node.style.flexDirection = flow;
      node.style.justifyContent = this.uiContainerComponent.justify[eid];
      node.style.alignItems = this.uiContainerComponent.align[eid];
    }

    const action = this.uiButtonComponent.action[eid];
    if (action) {
      node.dataset.uiAction = action;
    }
  }

  /**
   * Pause the scene by removing event listeners.
   */
  pause() {
    this.stopActionListener();
  }

  /**
   * Resume the scene by restoring event listeners.
   */
  resume() {
    this.startActionListener();
  }

  /**
   * Stop rendering the scene by removing all the render objects and
   * event listeners.
   */
  stop() {
    this.ambientLight.removeFromParent();
    this.objects.forEach((obj: three.Object3D) => obj.removeFromParent());
    this.stopActionListener();
  }

  /**
   * Get the renderer object for the given entity, if any.
   */
  getRenderObject<T extends three.Object3D>(eid: number): T | null {
    return this.objects[eid] as T || null;
  }

  /**
   * Get the UI element object for the given entity, if any.
   */
  getUIElement(eid: number): HTMLElement | null {
    return this.uiNodes[eid] || null;
  }

  private actionListener!: (e: MouseEvent) => void;

  /**
   * Start listening for clicks on UIButton entities to dispatch actions
   * added by addUIAction.
   */
  startActionListener(): void {
    if (!this.actionListener) {
      this.actionListener = this.dispatchAction.bind(this);
    }
    this.scene.game.ui?.renderer.domElement.addEventListener("click", this.actionListener);
  }

  /**
   * Stop listening for clicks on UIButton entities to dispatch actions
   * added by addUIAction.
   */
  stopActionListener(): void {
    this.scene.game.ui?.renderer.domElement.removeEventListener("click", this.actionListener);
  }

  /**
   * Load the texture and prepare it to be rendered.
   */
  loadTexture(textureId: number, forEid: string | number = "preload"): Promise<three.Texture> {
    const texture = Texture.getById(textureId);
    if (!texture.src) {
      throw `Unknown texture ID ${textureId} (${forEid})`;
    }
    let promise;
    const loadedSrc = this.sources[texture.src];
    if (loadedSrc instanceof three.Source) {
      // We already have this image loaded, so just make a new Texture
      // for it with the appropriate offsets.
      const glTexture = this.textures[textureId] = new three.Texture();
      glTexture.source = loadedSrc;
      glTexture.colorSpace = three.SRGBColorSpace;
      promise = Promise.resolve(glTexture);
    }
    else if (loadedSrc instanceof Promise) {
      // We are already loading this image, so make a new texture when
      // we're done
      const glTexture = this.textures[textureId] = new three.Texture();
      promise = loadedSrc.then((srcGlTexture) => {
        glTexture.source = srcGlTexture.source;
        glTexture.colorSpace = three.SRGBColorSpace;
        return glTexture;
      });
    }
    else {
      console.log(`Loading texture ${textureId} (${texture.src}: ${texture.x},${texture.y}/${texture.width},${texture.height})`);
      this.progress.total++;
      promise = this.sources[texture.src] = new Promise(
        (resolve, reject) => {
          const glTexture = this.loader.load(texture.src, resolve, undefined, reject)
          glTexture.colorSpace = three.SRGBColorSpace;
          this.textures[textureId] = glTexture;
          this.sources[texture.src] = glTexture.source;
        },
      ).then((value: any) => {
        this.progress.loaded++;
        this.dispatchEvent(this.progress);
        if (this.progress.loaded == this.progress.total) {
          this.progress = new ProgressEvent();
        }
        return value;
      })
    }

    promise = promise.then((glTexture: three.Texture) => {
      if (texture.x) {
        glTexture.offset.x = (texture.x + 0.5) / glTexture.image.width;
      }
      if (texture.y || texture.height) {
        glTexture.offset.y = (glTexture.image.height - (texture.y - 0.5 + (texture.height || 0))) / glTexture.image.height;
      }
      if (texture.width) {
        glTexture.repeat.x = (texture.width - 1) / glTexture.image.width;
      }
      if (texture.height) {
        glTexture.repeat.y = (texture.height - 1) / glTexture.image.height;
      }
      glTexture.needsUpdate = true;
      return glTexture;
    })

    return promise;
  }

  update(timeMilli: number) {
    this.createEnters();
    this.updateTransforms();
    this.addNewActive();
    this.removeInactive();

    // Sprites changing their texture
    for (const eid of this.spriteQuery(this.scene.world)) {
      this.updateSprite(eid);
    }

    // Cameras changing their properties
    for (const eid of this.cameraQuery(this.scene.world)) {
      this.updateCamera(eid);
    }

    // UI elements leaving the scene
    for (const eid of this.uiExitQuery(this.scene.world)) {
      this.remove(eid);
    }

    for (const eid of this.uiQuery(this.scene.world)) {
      this.updateUINode(eid);
    }
  }

  render() {
    // cameraQuery: Update camera properties and render if needed
    const update = this.cameraQuery(this.scene.world);
    for (const eid of update) {
      const camera = this.cameras[eid];
      if (!camera) {
        continue;
      }
      this.scene.game.renderer.render(this.scene._scene, camera);
      this.scene.game.ui.renderer.render(this.scene._uiScene, camera);
    }
  }

  updateTransform(eid: number) {
    const obj = this.objects[eid];
    if (!obj) {
      return;
    }
    obj.position.x = this.transformComponent.store.x[eid];
    obj.position.y = this.transformComponent.store.y[eid];
    obj.position.z = this.transformComponent.store.z[eid];
    obj.quaternion.x = this.transformComponent.store.rx[eid];
    obj.quaternion.y = this.transformComponent.store.ry[eid];
    obj.quaternion.z = this.transformComponent.store.rz[eid];
    obj.quaternion.w = this.transformComponent.store.rw[eid];
    obj.scale.x = this.transformComponent.store.sx[eid];
    obj.scale.y = this.transformComponent.store.sy[eid];
    obj.scale.z = this.transformComponent.store.sz[eid];
  }

  createCamera(eid: number): void {
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
      frustumSize * (ratio / -2),
      frustumSize * (ratio / 2),
      frustumSize / 2,
      frustumSize / -2,
      near, far,
    );
    camera.name = this.scene.getEntityById(eid).name;
    this.cameras[eid] = this.objects[eid] = camera;
    this.updateTransform(eid);
    this.updateCamera(eid);
  }

  updateCamera(eid: number) {
    const camera = this.objects[eid] as three.OrthographicCamera;
    if (!camera) {
      return;
    }
    camera.far = this.cameraComponent.store.far[eid];
    camera.near = this.cameraComponent.store.near[eid];
    camera.zoom = this.cameraComponent.store.zoom[eid];
    camera.updateProjectionMatrix();
  }

  createGroup(eid: number): three.Group {
    const group = this.objects[eid] = new three.Group();
    this.updateTransform(eid);
    return group;
  }

  loadTextureForSprite(eid: number): three.Texture {
    const tid = this.spriteComponent.store.textureId[eid];
    this.loadTexture(tid, eid).then((glTexture: three.Texture) => {
      // Update sprite geometry to match this new texture
      const sprite = this.objects[eid] as three.Mesh;
      const pixelScale = this.scene.game.config.renderer.pixelScale || 128;
      const texture = Texture.getById(tid);
      const width = (texture.width || glTexture.image?.width || pixelScale) / pixelScale;
      const height = (texture.height || glTexture.image?.height || pixelScale) / pixelScale;
      sprite.geometry = new three.PlaneGeometry(width, height);
      //this.render();
    });
    const glTexture = this.textures[tid];
    glTexture.anisotropy = 0;
    glTexture.magFilter = three.NearestFilter;
    glTexture.minFilter = three.NearestFilter;
    return glTexture;
  }

  createSprite(eid: number): three.Mesh {
    const texture = this.loadTextureForSprite(eid);
    const material = this.materials[eid] = new three.MeshStandardMaterial({ map: texture, alphaTest: 0.9, alphaToCoverage: true });
    const geometry = new three.PlaneGeometry(1, 1);
    const sprite = this.objects[eid] = new three.Mesh(geometry, material);
    sprite.name = this.scene.getEntityById(eid).name;
    sprite.userData.eid = eid;
    sprite.layers.enable(1);
    this.updateTransform(eid);
    return sprite;
  }

  updateSprite(eid: number) {
    const sprite = this.objects[eid] as three.Mesh;
    if (!sprite) {
      return;
    }
    const tid = this.spriteComponent.store.textureId[eid];
    let texture = this.textures[tid] || this.loadTextureForSprite(eid);
    if (!this.materials[eid] || (this.materials[eid] as three.MeshStandardMaterial).map !== texture) {
      const material = this.materials[eid] = new three.MeshStandardMaterial({ map: texture, alphaTest: 0.9, alphaToCoverage: true });
      sprite.material = material;
    }
  }

  remove(eid: number) {
    this.scene._scene.remove(this.objects[eid]);
    this.scene._uiScene.remove(this.objects[eid]);
    if (this.uiNodes[eid]) {
      this.uiNodes[eid].remove();
      delete this.uiNodes[eid];
    }
    delete this.objects[eid];
    delete this.materials[eid];
  }

  onResize(e: ResizeEvent) {
    // Fix camera settings to maintain exact size/aspect
    const { width, height } = e;
    const ratio = width / height;
    const update = this.cameraQuery(this.scene.world);
    for (const eid of update) {
      const frustumSize = this.cameraComponent.store.frustum[eid];
      const camera = this.cameras[eid];
      if (!camera) {
        continue;
      }
      camera.left = frustumSize * ratio / -2;
      camera.right = frustumSize * ratio / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2
      camera.updateProjectionMatrix();
    }
  }

  /**
   * Registered handlers for UI actions declared on the UIButton
   * component.
   */
  uiAction: { [key: string]: Array<(type: string) => void> } = {};

  /**
   * Add a UI action handler. UI actions are set on the UIButton
   * component. Clicking the button will call the registered actions.
   */
  addUIAction(type: string, listener: (type: string) => void): void {
    if (!this.uiAction[type]) {
      this.uiAction[type] = [];
    }
    this.uiAction[type].push(listener);
  }

  /**
   * Dispatch UI actions from the given MouseEvent, if the event was
   * a UIButton.
   */
  dispatchAction(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const button = target.closest('[data-ui-action]') as HTMLElement;
    // Only elements with UI actions
    if (!button) {
      return;
    }
    const action = button.dataset.uiAction;
    if (!action) {
      return;
    }
    if (!this.uiAction[action]?.length) {
      console.warn(`Cannot dispatch UI action: No listener for action: ${action}`);
      return;
    }
    this.uiAction[action].forEach(fn => fn(action));
  }
}
