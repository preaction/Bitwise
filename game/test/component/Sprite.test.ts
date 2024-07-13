import { expect, describe, test, beforeEach } from '@jest/globals';
import Game from '../../src/Game';
import Scene from '../../src/Scene';
import Sprite from '../../src/component/Sprite.js';
import Texture from '../../src/Texture';
import Entity from '../../src/Entity';

test('freezeEntity', async () => {
  const game = new Game({
    components: {
      Sprite: Sprite,
    },
  });
  const scene = new Scene(game);
  scene.addComponent('Sprite');
  const entity = scene.addEntity();
  const expectData = {
    texture: {
      $asset: 'Texture',
      path: 'example.jpg',
    },
    repeatX: 2,
    repeatY: 5,
  };
  await entity.addComponent('Sprite', { ...expectData });
  const component = scene.getComponent(Sprite);
  const data = component.freezeEntity(entity.id);
  expect(data).toStrictEqual(expectData);
});

describe('thawEntity', () => {
  let game: Game, scene: Scene, entity: Entity, component: Sprite;
  beforeEach(() => {
    game = new Game({
      components: {
        Sprite: Sprite,
      },
    });
    scene = new Scene(game);
    scene.addComponent('Sprite');
    entity = scene.addEntity();
    component = scene.getComponent(Sprite);
  });

  test('texturePath', async () => {
    const givenData = { texturePath: 'example.jpg' };
    await component.thawEntity(entity.id, givenData);

    const textureId = component.store.textureId[entity.id];
    const texture = Texture.getById(textureId);
    expect(texture.src).toEqual(givenData.texturePath);
  });

  test('texture (asset ref)', async () => {
    const givenData = {
      texture: {
        $asset: 'Texture',
        path: 'example.jpg',
      },
    };
    await component.thawEntity(entity.id, givenData);

    const textureId = component.store.textureId[entity.id];
    const texture = Texture.getById(textureId);
    expect(texture.src).toEqual(givenData.texture.path);
  });

  test('repeatX/repeatY', async () => {
    const givenData = {
      repeatX: 2,
      repeatY: 3,
    };
    await component.thawEntity(entity.id, givenData);

    expect(component.store.repeatX[entity.id]).toBe(givenData.repeatX);
    expect(component.store.repeatY[entity.id]).toBe(givenData.repeatY);
  });
});
