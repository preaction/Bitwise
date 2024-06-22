import { jest, describe, expect, test, beforeEach } from '@jest/globals';
import 'global-jsdom/register'; // Adds `document` object for three to use
import 'webgl-mock-threejs'; // Provides HTMLCanvasElement
import { OrthographicCamera, Sprite, Texture } from 'three';
import Game from '../../../src/Game';
import Entity from '../../../src/Entity';
import Scene from '../../../src/Scene';
import EditorRender from '../../../src/system/editor/Render';
import Input from '../../../src/system/Input';

function buildScene(): [Scene, EditorRender] {
  const game = new Game({
    canvas: document.createElement('canvas'),
    systems: {
      input: Input,
      editorRender: EditorRender,
    },
  });
  const scene = new Scene(game);
  scene.addSystem('input');
  scene.addSystem('editorRender');
  const system = scene.getSystem(EditorRender);
  return [scene, system];
}

beforeAll(() => {
  // XXX: This always returns true for a match, but we might want to
  // return `false` for devices when checking if they support mouse
  // input.
  Object.defineProperty(global, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

describe('EditorRender', () => {
  let scene: Scene, system: EditorRender, camera: Entity, sprite: Entity;
  beforeEach(() => {
    [scene, system] = buildScene();

    // Mock function for three TextureLoader
    system.loader.load = jest.fn(
      (_: string, resolve: (t: Texture) => void) => {
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

  describe('init()', () => {
    test('init() fires progress events', async () => {
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
    });

    test('init() adds editor camera to scene', async () => {
      await system.init();
      const threeScene = system.scene._scene;
      expect(threeScene.children).toHaveLength(1);
      expect(system.mainCamera).toBeDefined();
    });
  });

  test('start() adds active game objects to three scene', async () => {
    await system.init();
    system.start();

    const threeScene = system.scene._scene;
    expect(threeScene.children).toHaveLength(3);
    const threeCamera = threeScene.getObjectByName("camera") as OrthographicCamera;
    expect(threeCamera).toBeDefined();
    const threeSprite = threeScene.getObjectByName("sprite") as Sprite;
    expect(threeSprite).toBeDefined();
  });

  test('stop() removes objects (except editor camera) from three scene', async () => {
    await system.init();
    system.start();
    system.stop();

    const threeScene = system.scene._scene;
    expect(threeScene.children).toHaveLength(1);
  });

});
