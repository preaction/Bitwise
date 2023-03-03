import {describe, expect, test} from '@jest/globals';
import Game from '../../src/Game';
import Scene from '../../src/Scene';
import UIImage from '../../src/component/UIImage';

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

test('thawEntity', () => {
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
  component.thawEntity( entity.id, givenData );

  expect(component.fill[entity.id]).toEqual(givenData.fill);
  const imageId = component.store.imageId[ entity.id ];
  expect(game.load.texturePaths[imageId]).toEqual(givenData.imagePath);
});
