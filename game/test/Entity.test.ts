import {describe, beforeEach, expect, test, jest} from '@jest/globals';
import Entity from '../src/Entity.js';
import Game from '../src/Game.js';
import Scene from '../src/Scene.js';

let game:Game, scene:Scene, entity:Entity;
beforeEach( () => {
  game = new Game({});
  scene = new Scene( game );
  entity = scene.addEntity();
} );

describe('Entity.path', () => {
  test( 'path cannot be empty', () => {
    // @ts-ignore
    expect( () => entity.path = null ).toThrow();
    expect( () => entity.path = "" ).toThrow();
  });
});

describe( 'Entity.thaw', () => {
  test( 'thaw() updates entity properties', async () => {
    const data = {
      path: "New Path",
      type: "TestEntity",
      active: false,
    };
    await entity.thaw( data );
    expect( entity.path ).toBe( data.path );
    expect( entity.type ).toBe( data.type );
    expect( entity.active ).toBe( data.active );
  } );

  test( 'thaw() does not update properties not in data', async () => {
    const original = {
      path: entity.path,
      type: entity.type,
      active: entity.active,
    };
    await entity.thaw( {} );
    expect( entity.path ).toBe( original.path );
    expect( entity.type ).toBe( original.type );
    expect( entity.active ).toBe( original.active );
  });
} );
