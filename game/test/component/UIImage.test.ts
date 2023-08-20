import {describe, expect, test} from '@jest/globals';
import Game from '../../src/Game';
import Scene from '../../src/Scene';
import UIImage from '../../src/component/UIImage';
import Texture from '../../src/Texture';

test('freezeEntity', () => {
  const game = new Game({
    components: {
      UIImage: UIImage,
    },
  });
  const scene = new Scene( game );
  scene.addComponent( 'UIImage' );
  const entity = scene.addEntity();
  const expectData = { imagePath: 'example.jpg', fill: 'stretch' };
  entity.addComponent( 'UIImage', {...expectData} );

  const component = scene.getComponent(UIImage);
  const data = component.freezeEntity( entity.id );
  expect(data).toStrictEqual(expectData);
});

test('thawEntity', async () => {
  const game = new Game({
    components: {
      UIImage: UIImage,
    },
  });
  const scene = new Scene( game );
  scene.addComponent( 'UIImage' );
  const entity = scene.addEntity();
  const givenData = { imagePath: 'example.jpg', fill: 'stretch' };
  const component = scene.getComponent( UIImage );
  await component.thawEntity( entity.id, givenData );

  expect(component.fill[entity.id]).toEqual(givenData.fill);
  const imageId = component.store.imageId[ entity.id ];

  const texture = Texture.getById(imageId);
  expect(texture.src).toEqual(givenData.imagePath);
});
