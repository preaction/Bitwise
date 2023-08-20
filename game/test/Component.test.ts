import {describe, beforeEach, expect, test, jest} from '@jest/globals';
import * as bitecs from 'bitecs';
import Component from "../src/Component.js";
import Entity from '../src/Entity.js';
import Game from '../src/Game.js';
import Scene from '../src/Scene.js';

let game:Game, scene:Scene;
beforeEach( () => {
  game = new Game({});
  scene = new Scene( game );
} );

describe('Component.thawEntity', () => {
  class TestComponent extends Component {
    declare store: { x: number[], y: number[] };
    get componentData() {
      return {
        x: bitecs.Types.f32,
        y: bitecs.Types.f32,
      };
    }
  }

  let component:TestComponent;
  let entity:Entity;
  beforeEach( () => {
    component = new TestComponent(scene, scene.world);
    entity = scene.addEntity();
  } );

  test( 'thaws entity data', async () => {
    const eid = entity.id;
    const data = { x: 0, y: 2 };
    await component.thawEntity(eid, data);
    expect( component.store.x[eid] ).toBe( data.x );
    expect( component.store.y[eid] ).toBe( data.y );
  });

  test( 'accepts unknown entity fields', async () => {
    jest.spyOn(console, 'warn').mockImplementation( () => {} )
    const eid = entity.id;
    const data = { x: 0, y: 2, UNKNOWN: 0 };
    expect( async () => await component.thawEntity(eid, data) ).not.toThrow();
    expect( component.store.x[eid] ).toBe( data.x );
    expect( component.store.y[eid] ).toBe( data.y );
    expect( console.warn ).toHaveBeenCalledTimes( 1 );
  });
});
