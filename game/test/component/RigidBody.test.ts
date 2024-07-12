import { expect, describe, test, beforeEach } from '@jest/globals';
import Scene from '../../src/Scene';
import Game from '../../src/Game';
import Entity from '../../src/Entity';
import RigidBody from '../../src/component/RigidBody';

let game: Game, scene: Scene, entity: Entity;
beforeEach(() => {
  game = new Game({
    components: {
      RigidBody
    },
  });
  scene = new Scene(game);
  scene.addComponent('RigidBody');
  entity = scene.addEntity();
})

describe('component/RigidBody', () => {
  test('sets default values for fields', () => {
    entity.addComponent('RigidBody', {});
    const gotValues = entity.getComponent('RigidBody');
    const gotKeys = Object.keys(gotValues);
    const expectKeys = Object.keys(scene.getComponent(RigidBody).componentData);
    expect(gotKeys.sort()).toEqual(expectKeys.sort());
  });

});


