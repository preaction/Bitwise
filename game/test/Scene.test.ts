import {describe, expect, test} from '@jest/globals';
import Game from '../src/Game';
import Scene from '../src/Scene';
import System from '../src/System';
import ProgressEvent from '../src/event/ProgressEvent';

class FakeSystem extends System {
  resolveInit:any = null;
  rejectInit:any = null;
  async init() {
    const progress = new ProgressEvent();
    progress.loaded = 0;
    progress.total = 1;
    this.dispatchEvent( progress );
    return new Promise<any>(
      (resolve, reject) => {
        this.resolveInit = resolve;
        this.rejectInit = reject;
      }
    );
  }
}

describe('Scene.init', () => {
  const game = new Game({
    systems: {
      fakeSystem: FakeSystem,
      mockSystem: FakeSystem,
    },
  });
  const scene = new Scene( game );
  scene.addSystem( 'fakeSystem' );
  scene.addSystem( 'mockSystem' );
  const [ fakeSystem, mockSystem ] = scene.systems as FakeSystem[];

  const progressEvents = [] as ProgressEvent[];
  scene.addEventListener( 'progress', (e:ProgressEvent) => {
    progressEvents.push(e);
  });

  const promise = scene.init();

  test( 'First progress event(s) should be fired before init() is finished', () => {
    expect( progressEvents.length ).toBe( 2 );
    expect( progressEvents[0].loaded ).toBe( 0 );
    expect( progressEvents[0].total ).toBe( 1 );
    expect( progressEvents[1].loaded ).toBe( 0 );
    expect( progressEvents[1].total ).toBe( 2 );
  });

  test( 'System progress event should bubble up', () => {
    fakeSystem.dispatchEvent( new ProgressEvent(1, 1) );
    expect( progressEvents.length ).toBe( 3 );
    expect( progressEvents[2].loaded ).toBe( 1 );
    expect( progressEvents[2].total ).toBe( 2 );
  });

  test( 'System progress event can change its total', () => {
    mockSystem.dispatchEvent( new ProgressEvent(5, 5) );
    expect( progressEvents.length ).toBe( 4 );
    expect( progressEvents[3].loaded ).toBe( 6 );
    expect( progressEvents[3].total ).toBe( 6 );
  });

  test( 'init() promise resolves after all System init() promises', () => {
    fakeSystem.resolveInit();
    mockSystem.resolveInit();
    expect( promise ).resolves.toEqual(expect.anything());
  });
});
