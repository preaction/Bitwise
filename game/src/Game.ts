
import * as three from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import * as bitecs from 'bitecs';
import Scene, { SceneState } from './Scene.js';
import Load from './Load.js';
import Component from './Component.js';
import System from './System.js';

import ActiveComponent from './component/Active.js';
import TransformComponent from './component/Transform.js';
import OrthographicCameraComponent from './component/OrthographicCamera.js';
import SpriteComponent from './component/Sprite.js';
import RigidBodyComponent from './component/RigidBody.js';
import BoxColliderComponent from './component/BoxCollider.js';
import UIElementComponent from './component/UIElement.js';
import UIImageComponent from './component/UIImage.js';
import UITextComponent from './component/UIText.js';
import UIButtonComponent from './component/UIButton.js';
import UIContainerComponent from './component/UIContainer.js';

import InputSystem from './system/Input.js';
import RenderSystem from './system/Render.js';
import PhysicsSystem from './system/Physics.js';

import EditorRenderSystem from './system/editor/Render.js';
import EditorPhysicsSystem from './system/editor/Physics.js';

const DEFAULT_SYSTEMS = {
  Input: InputSystem,
  Render: RenderSystem,
  Physics: PhysicsSystem,
  // XXX: Default systems should load their own editor system if they
  // have one? Is there a way to keep editor systems out of the full
  // game build?
  EditorRender: EditorRenderSystem,
  EditorPhysics: EditorPhysicsSystem,
};

const DEFAULT_COMPONENTS = {
  Active: ActiveComponent,
  Transform: TransformComponent,
  OrthographicCamera: OrthographicCameraComponent,
  Sprite: SpriteComponent,
  RigidBody: RigidBodyComponent,
  BoxCollider: BoxColliderComponent,
  UIElement: UIElementComponent,
  UIImage: UIImageComponent,
  UIText: UITextComponent,
  UIButton: UIButtonComponent,
  UIContainer: UIContainerComponent,
};

export type GameConfig = {
  renderer: {
    width: number,
    height: number,
    pixelScale?: number,
  },
  components?: { [key: string]: typeof Component },
  systems?: { [key: string]: typeof System },
};

export type GameEvents = {
  start: {},
  stop: {},
  resize: { width: number, height: number },
  beforeRender: {},
  afterRender: {},
};

/**
 * Game is main game container. Games are made up of one or many Scenes.
 * Any number of Scenes may be active at once.
 */
export default class Game extends three.EventDispatcher<GameEvents> {
  canvas!: HTMLCanvasElement;
  load: Load;
  renderer!: three.WebGLRenderer;
  ui!: { renderer: CSS3DRenderer };
  ecs: typeof bitecs;

  width: number = 0;
  height: number = 0;
  autoSize: boolean = true;

  /**
   * The path to the JSON file containing initial scene to load. If set,
   * the game will start this scene immediately when start() is called.
   */
  initialScenePath: string = '';
  scenes: Scene[] = [];
  data: { [key: string]: any } = {};

  components: { [key: string]: typeof Component } = {};
  systems: { [key: string]: typeof System } = {};

  /**
   * The config property provides the default configuration values for
   * the game. These values can be overridden by the config passed to
   * the game's constructor.
   */
  get config(): GameConfig {
    return {
      renderer: {
        width: 0,
        height: 0,
        pixelScale: 128,
      },
      components: {},
      systems: {},
    }
  }

  /**
   */
  constructor(opt: any) {
    super();
    const conf = this.config;
    // XXX: Config should be merged with options
    this.ecs = bitecs;
    this.canvas = opt.canvas;
    this.load = new Load(opt.loader || {});
    this.width = opt.renderer?.width ?? conf.renderer?.width;
    this.height = opt.renderer?.height ?? conf.renderer?.height;
    this.data = opt.data || {};
    if (this.width > 0 || this.height > 0) {
      this.autoSize = false;
    }
    this.initialScenePath = opt.scene || '';
    this.components = {
      ...DEFAULT_COMPONENTS,
      ...(conf.components ?? {}),
      ...opt.components,
    };
    this.systems = {
      ...DEFAULT_SYSTEMS,
      ...(conf.systems ?? {}),
      ...opt.systems,
    };
  }

  /**
   * Start the game. Sets up the renderer and canvas as needed, and
   * launches the initial scene if initialScenePath is set.
   */
  async start(): Promise<any> {
    // Create the renderer after the <canvas> exists
    const renderer = new three.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
    });
    this.renderer = renderer;

    if (this.autoSize) {
      // Record the initial render height/width in case it changes. To
      // keep responsiveness, we will reset the renderer size and adjust the
      // camera so that everything looks the same.
      const { width, height } = this.renderSize();
      this.width = width;
      this.height = height;
      window.addEventListener('resize', this.onResize.bind(this));
    }

    this.renderer.setSize(this.width, this.height, false);

    this.ui = { renderer: new CSS3DRenderer() };
    const uiRenderer = this.ui.renderer;
    this.canvas.insertAdjacentElement("afterend", uiRenderer.domElement);
    // Position ui dom element exactly above canvas
    const uiEl = uiRenderer.domElement;
    uiEl.style.position = "absolute";
    uiEl.style.left = this.canvas.clientLeft + "px";
    uiEl.style.top = this.canvas.clientTop + "px";
    uiEl.style.pointerEvents = "none";
    uiRenderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    this.dispatchEvent({ type: 'start' });

    if (this.initialScenePath) {
      const scene = await this.loadScene(this.initialScenePath);
      await scene.init();
      scene.start();
    }

    this.render();
  }

  /**
   * Stop the game. Stops any running scenes and cleans up anything
   * created by start()
   */
  stop() {
    this.dispatchEvent({ type: 'stop' });
    for (const scene of this.scenes) {
      scene.stop();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.ui.renderer) {
      this.ui.renderer.domElement.remove();
    }
  }

  /**
   * onResize handles the window resize event. See
   * resizeRendererToDisplaySize()
   */
  protected onResize() {
    this.resizeRendererToDisplaySize()
  }

  /**
   * renderSize gets the size of the canvas in screen pixels (so, using
   * the device's pixel ratio).
   */
  renderSize(): three.Vector2 {
    if (!this.renderer) {
      return new three.Vector2(0, 0);
    }
    const canvas = this.renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = canvas.clientWidth * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    const vec = new three.Vector2(width, height);
    return vec;
  }

  /**
   * resizeRendererToDisplaySize resizes the renderer to match the
   * canvas's aspect ratio. This ensures that objects being rendered are
   * not stretched or squished.
   */
  resizeRendererToDisplaySize() {
    if (!this.renderer) {
      return;
    }
    const canvas = this.renderer.domElement;
    const render = this.renderSize();
    const needResize = canvas.width !== render.width || canvas.height !== render.height;
    if (needResize) {
      this.renderer.setSize(render.width, render.height, false);
      this.ui.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.dispatchEvent({ type: 'resize', width: render.width, height: render.height });
    }
    return needResize;
  }

  /**
   * render is the main game loop. It handles all Scene state changes
   * and dispatches the appropriate scene update() and render() calls.
   */
  render(timeMilli: DOMHighResTimeStamp = 0, timeTotal: DOMHighResTimeStamp = 0) {
    if (!this.renderer) {
      return;
    }

    this.dispatchEvent({ type: 'beforeRender' });
    SCENES:
    for (const scene of this.scenes) {
      switch (scene.state) {
        case SceneState.Start:
          scene.render();
          scene.state = SceneState.Run;
          continue SCENES;
        case SceneState.Run:
          scene.update(timeMilli);
        // fall-through to render
        case SceneState.Pause:
          scene.render();
          continue SCENES;
      }
    }
    this.dispatchEvent({ type: 'afterRender' });

    requestAnimationFrame((t: DOMHighResTimeStamp) => this.render(t - timeTotal, t));
  }

  /**
   * registerComponent registers a new component constructor. This
   * component can then be used by scenes.
   */
  registerComponent(name: string, component: typeof Component) {
    this.components[name] = component;
  }

  /**
   * registerSystem registers a new system constructor. This system can
   * then be used by scenes.
   */
  registerSystem(name: string, system: typeof System) {
    this.systems[name] = system;
  }

  /**
   * addScene creates a new, blank scene object. Once the scene is
   * constructed, add systems, components, and entities or load its data
   * with the Scene.thaw() method.
   */
  addScene() {
    const scene = new Scene(this);
    this.scenes.push(scene);
    return scene;
  }

  /**
   * loadScene loads the JSON at the given path and uses it to create
   * a new Scene object.
   */
  async loadScene(path: string): Promise<Scene> {
    const sceneData = await this.load.json(path);
    const scene = this.addScene();
    scene.thaw(sceneData);
    return scene;
  }
}

