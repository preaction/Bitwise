import {describe, expect, test} from '@jest/globals';
import Game from '../../src/Game';
import Scene from '../../src/Scene';
import Render from '../../src/system/Render';
import 'webgl-mock-threejs';

describe( 'Render.init()', () => {
  const game = new Game({
    canvas: new HTMLCanvasElement(),
    systems: {
      render: Render,
    },
  });
  const scene = new Scene( game );
  scene.addSystem( 'render' );
  const system = scene.getSystem( Render );

  // XXX: Give it something to initialize

  const progressEvents = [] as ProgressEvent[];
  system.addEventListener( 'progress', (e:ProgressEvent) => {
    progressEvents.push(e);
  });

  const promise = system.init();
  test( 'First progress event should be fired before init() is finished', () => {
    expect( progressEvents.length ).toBe( 1 );
    expect( progressEvents[0].loaded ).toBe( 0 );
    expect( progressEvents[0].total ).toBe( 0 );
  });

  test( 'init() promise resolves', () => {
    expect( promise ).resolves.toEqual(expect.anything());
  });
} );
