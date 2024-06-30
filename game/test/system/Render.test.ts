import { jest, describe, expect, test, beforeEach } from '@jest/globals';
import 'global-jsdom/register'; // Adds `document` object for three to use
import 'webgl-mock-threejs'; // Provides HTMLCanvasElement
import { AmbientLight, OrthographicCamera, Sprite, Texture } from 'three';
import Game from '../../src/Game';
import Entity from '../../src/Entity';
import Scene from '../../src/Scene';
import Render from '../../src/system/Render';

function buildScene(): [Scene, Render] {
  const game = new Game({
    canvas: new HTMLCanvasElement(),
    systems: {
      render: Render,
    },
  });
  const scene = new Scene(game);
  scene.addSystem('render');
  const system = scene.getSystem<Render>(Render);
  return [scene, system];
}

describe('Render', () => {
  let scene: Scene, system: Render, camera: Entity, sprite: Entity;
  beforeEach(() => {
    [scene, system] = buildScene();

    // Mock function for three TextureLoader
    system.loader.load = jest.fn(
      (path: string, resolve: (t: Texture) => void, _: any, reject: (e: any) => void) => {
        const t = new Texture();
        setTimeout(() => resolve(t), 0);
        return t;
      }
    );

    // Give it some entities to initialize
    // Camera
    camera = scene.addEntity();
    camera.path = "camera";
    camera.active = true;
    camera.addComponent('Transform', { x: 0, y: 0, z: 0, sx: 1, sy: 1, sz: 1 });
    camera.addComponent('OrthographicCamera', {});
    // Sprite
    sprite = scene.addEntity();
    sprite.path = "sprite";
    sprite.active = true;
    sprite.addComponent('Transform', { x: 0, y: 0, z: 0, sx: 1, sy: 1, sz: 1 });
    sprite.addComponent('Sprite', {});
  });

  test('init()', async () => {
    const progressEvents = [] as ProgressEvent[];
    system.addEventListener('progress', (e: ProgressEvent) => {
      progressEvents.push(e);
    });

    const promise = system.init();
    expect(progressEvents.length).toBe(1);
    expect(progressEvents[0].loaded).toBe(0);
    expect(progressEvents[0].total).toBe(1);
    await expect(promise).resolves.toEqual(expect.anything());

    expect(progressEvents.length).toBe(2);
    expect(progressEvents[0].loaded).toBe(1);
    expect(progressEvents[0].total).toBe(1);

    const threeScene = system.scene._scene;
    expect(threeScene.children).toHaveLength(0);
    expect(system.mainCamera).toBeDefined();
  });

  test('start() adds active objects to three scene', async () => {
    await system.init();
    system.start();

    const threeScene = system.scene._scene;
    expect(threeScene.children).toHaveLength(3);
    const threeCamera = threeScene.getObjectByName("camera") as OrthographicCamera;
    expect(threeCamera).toBeDefined();
    const threeSprite = threeScene.getObjectByName("sprite") as Sprite;
    expect(threeSprite).toBeDefined();
    const threeLight = threeScene.getObjectByName("ambientLight") as AmbientLight;
    expect(threeLight).toBeDefined();
  });

  test('stop() removes objects from three scene', async () => {
    await system.init();
    system.start();
    system.stop();

    const threeScene = system.scene._scene;
    expect(threeScene.children).toHaveLength(0);
  });

  test.skip('adds UIElement to UI scene', async () => {
    // XXX: Skipped because we do not mock enough of WebGL
    // For this to work, webgl-mock-threejs would need to fix some bits
    // of WebGL mocking for new things threejs does during init, _and_
    // the HTMLCanvasElement constructor would need to return a jsdom
    // element that additionally mocks the other stuff.
    await scene.game.start();

    const uiElement = scene.addEntity();
    uiElement.addComponent('UIElement', {});
    await system.init();

    const uiCanvas = scene.game.ui.renderer.domElement;
    expect(uiCanvas.querySelector('div')).toBeDefined();
    console.log(uiCanvas);
  });
});
