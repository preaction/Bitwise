import { jest, describe, expect, test, beforeEach } from '@jest/globals';
import 'global-jsdom/register'; // Adds `document` object for three to use
import 'webgl-mock-threejs'; // Provides HTMLCanvasElement
import flushPromises from 'flush-promises';
import * as three from 'three';
import Game from '../../src/Game';
import Entity from '../../src/Entity';
import Scene from '../../src/Scene';
import Render from '../../src/system/Render';
import Texture from '../../src/Texture';
import Load from '../../src/Load';
import Atlas from '../../src/Atlas';

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

let scene: Scene, system: Render, camera: Entity, sprite: Entity, mockThreeLoad: jest.MockedFunction<three.TextureLoader["load"]>;
beforeEach(() => {
  [scene, system] = buildScene();

  // Mock function for three TextureLoader
  mockThreeLoad = system.loader.load = jest.fn(
    (path: string, resolve: (t: three.Texture) => void, _: any, reject: (e: any) => void) => {
      const t = new three.Texture();
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

describe('Render', () => {
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
    const threeCamera = threeScene.getObjectByName("camera") as three.OrthographicCamera;
    expect(threeCamera).toBeDefined();
    const threeSprite = threeScene.getObjectByName("sprite") as three.Sprite;
    expect(threeSprite).toBeDefined();
    const threeLight = threeScene.getObjectByName("ambientLight") as three.AmbientLight;
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

  describe('update()', () => {
    beforeEach(async () => {
      await system.init();
      system.start();
    });

    test('update adds new active sprite to scene', async () => {
      const threeScene = system.scene._scene;
      const threeEntityCount = threeScene.children.length;
      const entityData = {
        name: 'NewSprite',
        active: true,
        components: {
          Transform: { x: 0, y: 0, z: 0, sx: 1, sy: 1, sz: 1 },
          Sprite: {},
        },
      };
      scene.addEntity(entityData);

      system.update(0);
      expect(threeScene.children).toHaveLength(threeEntityCount + 1);
      const threeObject = threeScene.getObjectByName(entityData.name) as three.Mesh;
      expect(threeObject).toBeInstanceOf(three.Mesh);

      // Default sprite geometry is 1x1 box
      const geometry = threeObject.geometry;
      geometry.computeBoundingBox();
      const expectBounds = new three.Box3(new three.Vector3(-0.5, -0.5, 0), new three.Vector3(0.5, 0.5, 0));
      expect(geometry.boundingBox).toEqual(expectBounds);
    });

    test('update sprite geometry based on texture size from image', async () => {
      const width = 80;
      const height = 120;
      const scale = scene.game.config.renderer.pixelScale = 128;
      const texture = new Texture(new Load(), { path: 'image.png' });
      mockThreeLoad.mockImplementation(
        (path: string, resolve: (t: three.Texture) => void, _: any, reject: (e: any) => void) => {
          const t = new three.Texture();
          t.image = { height, width };
          setTimeout(() => resolve(t), 0);
          return t;
        }
      );
      sprite.setComponent('Sprite', {
        textureId: texture.textureId,
      });
      system.update(0);
      // XXX: Why does this test fail unless we flush promises more than
      // once?
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const threeScene = system.scene._scene;
      const threeObject = threeScene.getObjectByName(sprite.name) as three.Mesh;
      expect(threeObject).toBeInstanceOf(three.Mesh);

      // Default sprite geometry is 1x1 box
      const geometry = threeObject.geometry;
      geometry.computeBoundingBox();
      const expectBounds = new three.Box3(new three.Vector3(-0.5 * (width / scale), -0.5 * (height / scale), 0), new three.Vector3(0.5 * (width / scale), 0.5 * (height / scale), 0));
      expect(geometry.boundingBox).toEqual(expectBounds);
    });

    test('update sprite geometry based on texture size from Atlas', async () => {
      const texture = new Texture(new Load(), { path: 'atlas.xml/texture.png' });
      texture.atlas = new Atlas(texture.load, { path: 'atlas.xml', src: 'image.png' });
      const width = texture.width = 80;
      const height = texture.height = 120;
      texture.x = width * 4;
      texture.y = height;
      const scale = scene.game.config.renderer.pixelScale = 128;
      mockThreeLoad.mockImplementation(
        (path: string, resolve: (t: three.Texture) => void, _: any, reject: (e: any) => void) => {
          const t = new three.Texture();
          t.image = { height: height * 2, width: width * 12 };
          setTimeout(() => resolve(t), 0);
          return t;
        }
      );
      sprite.setComponent('Sprite', {
        textureId: texture.textureId,
      });
      system.update(0);
      // XXX: Why does this test fail unless we flush promises more than
      // once?
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const threeScene = system.scene._scene;
      const threeObject = threeScene.getObjectByName(sprite.name) as three.Mesh;
      expect(threeObject).toBeInstanceOf(three.Mesh);

      // Default sprite geometry is 1x1 box
      const geometry = threeObject.geometry;
      geometry.computeBoundingBox();
      const expectBounds = new three.Box3(new three.Vector3(-0.5 * (width / scale), -0.5 * (height / scale), 0), new three.Vector3(0.5 * (width / scale), 0.5 * (height / scale), 0));
      expect(geometry.boundingBox).toEqual(expectBounds);
    });

  });
});
