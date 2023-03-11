import {jest, describe, expect, test, beforeEach} from '@jest/globals';
import 'global-jsdom/register'; // Adds `document` object for three to use
import Game from '../../src/Game';
import Scene from '../../src/Scene';
import Input from '../../src/system/Input';

function buildScene(canvas?:HTMLElement):[ Scene, Input ] {
  const game = new Game({
    canvas: canvas ?? document.createElement('canvas'),
    systems: {
      input: Input,
    },
  });
  const scene = new Scene( game );
  scene.addSystem( 'input' );
  const system = scene.getSystem( Input );
  return [scene, system];
}

describe( 'Input', () => {
  let scene:Scene, system:Input, canvas:HTMLCanvasElement;
  beforeEach( () => {
    [scene, system] = buildScene();
    canvas = scene.game.canvas;

    // XXX: This always returns true for a match, but we might want to
    // return `false` for devices when checking if they support mouse
    // input.
    Object.defineProperty(global, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

  } );

  test( 'init() does not add event listeners to canvas', async () => {
    await system.init();
    // watchKey
    system.watchKey( ' ' );
    // watchKeypress
    system.watchKeypress( ' ' );

    canvas.dispatchEvent( new KeyboardEvent("keydown", { key: " " }) );
    expect( system.key ).not.toHaveProperty(" ");
    expect( system.keypress ).not.toHaveProperty(" ");

    canvas.dispatchEvent( new KeyboardEvent("keyup", { key: " " }) );
    expect( system.key ).not.toHaveProperty(" ");
    expect( system.keypress ).not.toHaveProperty(" ");

    // watchPointer
    system.watchPointer();
    const pointerEventProps = {
      bubbles: true,
      cancelable: true,
      pointerId: 0,
      pointerType: 'mouse',
      isPrimary: true,
      // button: 
      // buttons: 
      // screenX / screenY
      // clientX / clientY
      clientX: 50,
      clientY: 50,
    };

    // XXX: jsdom does not currently support PointerEvent, so I'm using
    // MouseEvent instead for the moment...
    // https://github.com/jsdom/jsdom/pull/2666
    canvas.dispatchEvent( new MouseEvent("pointerover", {...pointerEventProps}) );
    expect( system.pointers ).toHaveLength(1);
    expect( system.pointers[0].active ).toBeFalsy();
  } );

  test( 'start() adds event listeners to canvas', async () => {
    await system.init();
    system.start();

    // watchKey
    system.watchKey( ' ' );
    // watchKeypress
    system.watchKeypress( ' ' );

    canvas.dispatchEvent( new KeyboardEvent("keydown", { key: " " }) );
    expect( system.key ).toHaveProperty(" ");
    expect( system.key[" "] ).toBeTruthy();
    expect( system.keypress ).toHaveProperty(" ");
    expect( system.keypress[" "] ).toBeTruthy();

    canvas.dispatchEvent( new KeyboardEvent("keyup", { key: " " }) );
    expect( system.key ).toHaveProperty(" ");
    expect( system.key[" "] ).toBeFalsy();
    expect( system.keypress ).toHaveProperty(" ");
    expect( system.keypress[" "] ).toBeTruthy();

    // XXX: After render, the keypresses should be cleared
    // expect( system.keypress ).toHaveProperty(" ");
    // expect( system.keypress[" "] ).toBeFalsy();

    // watchPointer
    system.watchPointer();
    const pointerEventProps = {
      bubbles: true,
      cancelable: true,
      pointerId: 0,
      pointerType: 'mouse',
      isPrimary: true,
      // button: 
      // buttons: 
      // screenX / screenY
      // clientX / clientY
      clientX: 50,
      clientY: 50,
    };

    // XXX: jsdom does not currently support PointerEvent, so I'm using
    // MouseEvent instead for the moment...
    // https://github.com/jsdom/jsdom/pull/2666
    canvas.dispatchEvent( new MouseEvent("pointerover", {...pointerEventProps}) );
    expect( system.pointers ).toHaveLength(1);
    expect( system.pointers[0].active ).toBeTruthy();
  } );

  test( 'stop() removes event listeners from canvas', async () => {
    await system.init();
    system.start();
    system.stop();

    // watchKey
    system.watchKey( ' ' );
    // watchKeypress
    system.watchKeypress( ' ' );

    canvas.dispatchEvent( new KeyboardEvent("keydown", { key: " " }) );
    expect( system.key ).not.toHaveProperty(" ");
    expect( system.keypress ).not.toHaveProperty(" ");

    canvas.dispatchEvent( new KeyboardEvent("keyup", { key: " " }) );
    expect( system.key ).not.toHaveProperty(" ");
    expect( system.keypress ).not.toHaveProperty(" ");

    // watchPointer
    system.watchPointer();
    const pointerEventProps = {
      bubbles: true,
      cancelable: true,
      pointerId: 0,
      pointerType: 'mouse',
      isPrimary: true,
      // button: 
      // buttons: 
      // screenX / screenY
      // clientX / clientY
      clientX: 50,
      clientY: 50,
    };

    // XXX: jsdom does not currently support PointerEvent, so I'm using
    // MouseEvent instead for the moment...
    // https://github.com/jsdom/jsdom/pull/2666
    canvas.dispatchEvent( new MouseEvent("pointerover", {...pointerEventProps}) );
    expect( system.pointers ).toHaveLength(1);
    expect( system.pointers[0].active ).toBeFalsy();
  } );

  test( `multiple Input systems can be running`, async () => {
    await system.init();
    system.start();

    const [scene2, system2] = buildScene(canvas);
    await system2.init();
    system2.start();

    // Can watch same events on both systems and get same results
    system.watchKey( ' ' );
    system.watchPointer();
    system2.watchKey( ' ' );
    system2.watchPointer();

    canvas.dispatchEvent( new KeyboardEvent("keydown", { key: " " }) );
    expect( system.key ).toHaveProperty(" ");
    expect( system.key[" "] ).toBeTruthy();
    expect( system2.key ).toHaveProperty(" ");
    expect( system2.key[" "] ).toBeTruthy();

    canvas.dispatchEvent( new KeyboardEvent("keyup", { key: " " }) );
    expect( system.key ).toHaveProperty(" ");
    expect( system.key[" "] ).toBeFalsy();
    expect( system2.key ).toHaveProperty(" ");
    expect( system2.key[" "] ).toBeFalsy();

    // XXX: jsdom does not currently support PointerEvent, so I'm using
    // MouseEvent instead for the moment...
    // https://github.com/jsdom/jsdom/pull/2666
    const pointerEventProps = {
      bubbles: true,
      cancelable: true,
      pointerId: 0,
      pointerType: 'mouse',
      isPrimary: true,
      // button: 
      // buttons: 
      // screenX / screenY
      // clientX / clientY
      clientX: 50,
      clientY: 50,
    };

    canvas.dispatchEvent( new MouseEvent("pointerover", {...pointerEventProps}) );
    expect( system.pointers ).toHaveLength(1);
    expect( system.pointers[0].active ).toBeTruthy();
    expect( system2.pointers ).toHaveLength(1);
    expect( system2.pointers[0].active ).toBeTruthy();
  });

  test( `stopping one scene's Input does not stop another's`, async () => {
    await system.init();
    system.start();

    const [scene2, system2] = buildScene(canvas);
    await system2.init();
    system2.start();

    // Can watch same events on both systems and get same results
    system.watchKey( ' ' );
    system2.watchKey( ' ' );
    system.watchPointer();
    system2.watchPointer();

    // Stopping one scene does not affect the other
    system2.stop();

    canvas.dispatchEvent( new KeyboardEvent("keydown", { key: " " }) );
    expect( system.key ).toHaveProperty(" ");
    expect( system.key[" "] ).toBeTruthy();
    expect( system2.key[" "] ).toBeFalsy();

    canvas.dispatchEvent( new KeyboardEvent("keyup", { key: " " }) );
    expect( system.key ).toHaveProperty(" ");
    expect( system.key[" "] ).toBeFalsy();
    expect( system2.key[" "] ).toBeFalsy();

    // XXX: jsdom does not currently support PointerEvent, so I'm using
    // MouseEvent instead for the moment...
    // https://github.com/jsdom/jsdom/pull/2666
    const pointerEventProps = {
      bubbles: true,
      cancelable: true,
      pointerId: 0,
      pointerType: 'mouse',
      isPrimary: true,
      // button: 
      // buttons: 
      // screenX / screenY
      // clientX / clientY
      clientX: 50,
      clientY: 50,
    };

    canvas.dispatchEvent( new MouseEvent("pointerover", {...pointerEventProps}) );
    expect( system.pointers ).toHaveLength(1);
    expect( system.pointers[0].active ).toBeTruthy();
    expect( system2.pointers ).toHaveLength(1);
    expect( system2.pointers[0].active ).toBeFalsy();
  } );
});
