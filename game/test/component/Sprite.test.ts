import {expect, test} from '@jest/globals';
import Game from '../../src/Game';
import Scene from '../../src/Scene';
import Sprite from '../../src/component/Sprite.js';
import Texture from '../../src/Texture';

test('freezeEntity', () => {
  const game = new Game({
    components: {
      Sprite: Sprite,
    },
  });
  const scene = new Scene( game );
  scene.addComponent( 'Sprite' );
  const entity = scene.addEntity();
  const expectData = { texturePath: 'example.jpg' };
  entity.addComponent( 'Sprite', {...expectData} );

  const component = scene.getComponent(Sprite);
  const data = component.freezeEntity( entity.id );
  expect(data).toStrictEqual(expectData);
});

test('thawEntity', () => {
  const game = new Game({
    components: {
      Sprite: Sprite,
    },
  });
  const scene = new Scene( game );
  scene.addComponent( 'Sprite' );
  const entity = scene.addEntity();
  const givenData = { texturePath: 'example.jpg' };
  const component = scene.getComponent( Sprite );
  component.thawEntity( entity.id, givenData );

  const textureId = component.store.textureId[ entity.id ];
  const texture = Texture.getById(textureId);
  expect(texture.src).toEqual(givenData.texturePath);
});
