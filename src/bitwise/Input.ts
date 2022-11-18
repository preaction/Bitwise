
import Game from './Game.js';

type Pointer = {
  id: number,
  active: boolean,
  x: number,
  y: number,
  button: number,
  buttonPress: number,
};

export default class Input {
  // Event types
  // keyup
  // keydown
  // mouseup
  // mousedown
  // mousemove
  // wheel
  // touchstart
  // touchend
  // touchmove
  // touchcancel
  game:Game;
  watchingKeys:{ [key:string]: Set<string> } = {};
  watchingKeypresses:{ [key:string]: Set<string> } = {};

  /**
   * key holds the state of any keys added to the watch list. "true" if
   * the key is down, "false" if not.
   */
  key:{ [key:string]: boolean } = {};

  /**
   * keypress holds the keys that have been pressed since the last
   * update cycle.
   */
  keypress:{ [key:string]: boolean } = {};

  _downHandler:null|((e:KeyboardEvent) => void) = null;
  _upHandler:null|((e:KeyboardEvent) => void) = null;

  // The differences between key and keypress:
  //  Key is the up/down state of the key or key-combo
  //  Keypress is whether the key has ever been down since the last
  //    update. Keypress is reset after every update (technically, in
  //    the after-render event)

  constructor( game:Game ) {
    this.game = game;
    game.addEventListener( 'afterRender', this.clearKeypresses.bind(this) );
    game.addEventListener( 'afterRender', this.clearButtonPresses.bind(this) );
  }

  start() {
    this.game.canvas.tabIndex = 1;
    this.game.canvas.addEventListener( 'keydown', this._downHandler = this.keydown.bind(this) );
    this.game.canvas.addEventListener( 'keyup', this._upHandler = this.keyup.bind(this) );
    this.game.canvas.onpointerover = this.pointerbegin.bind(this);
    this.game.canvas.onpointerenter = this.pointerbegin.bind(this);
    this.game.canvas.onpointerdown = this.pointerdown.bind(this);
    this.game.canvas.onpointermove = this.pointerchange.bind(this);
    this.game.canvas.onpointerup = this.pointerchange.bind(this);
    this.game.canvas.onpointercancel = this.pointerend.bind(this);
    this.game.canvas.onpointerout = this.pointerend.bind(this);
    this.game.canvas.onpointerleave = this.pointerend.bind(this);
    this.game.canvas.style.touchAction = "none";
  }

  stop() {
    if ( this._downHandler ) {
      this.game.canvas.removeEventListener( 'keydown', this._downHandler );
      this._downHandler = null;
    }
    if ( this._upHandler ) {
      this.game.canvas.removeEventListener( 'keyup', this._upHandler );
      this._upHandler = null;
    }
    this.game.canvas.onpointerover = null;
    this.game.canvas.onpointerenter = null;
    this.game.canvas.onpointerdown = null;
    this.game.canvas.onpointermove = null;
    this.game.canvas.onpointerup = null;
    this.game.canvas.onpointercancel = null;
    this.game.canvas.onpointerout = null;
    this.game.canvas.onpointerleave = null;
    this.game.canvas.style.touchAction = "unset";
  }

  keydown(e:KeyboardEvent) {
    if ( e.key in this.watchingKeys ) {
      for ( const alias of this.watchingKeys[e.key] ) {
        this.key[alias] = true;
      }
    }
    if ( e.key in this.watchingKeypresses ) {
      for ( const alias of this.watchingKeypresses[e.key] ) {
        this.keypress[alias] = true;
      }
    }
  }
  keyup(e:KeyboardEvent) {
    if ( e.key in this.watchingKeys ) {
      for ( const alias of this.watchingKeys[e.key] ) {
        this.key[alias] = false;
      }
    }
  }

  on( event:string, fn:(e:Event) => void ) {
    this.game.canvas.addEventListener( event, fn );
  }
  off( event:string, fn:(e:Event) => void ) {
    this.game.canvas.removeEventListener( event, fn );
  }

  watchKey( key:string, alias:string='' ) {
    if ( !(key in this.watchingKeys) ) {
      this.watchingKeys[key] = new Set();
    }
    this.watchingKeys[key].add( alias || key );
  }
  watchKeypress( key:string, alias:string='' ) {
    if ( !(key in this.watchingKeypresses) ) {
      this.watchingKeypresses[key] = new Set();
    }
    this.watchingKeypresses[key].add( alias || key );
  }
  clearKeypresses() {
    this.keypress = {};
  }

  pointers:Pointer[] = [];
  watchPointer( count:number=0 ) {
    if ( !count ) {
      count = navigator.maxTouchPoints;
      // Add mouse if detected
      if ( matchMedia('(pointer:fine)').matches ) {
        count++;
      }
    }
    // Pre-create enough pointer objects
    for ( let i = this.pointers.length; i < count; i++ ) {
      this.pointers.push({
        id: 0,
        active: false,
        x: 0,
        y: 0,
        button: 0,
        buttonPress: 0,
      });
    }
  }

  // pointerover / pointerenter
  pointerbegin( ev:PointerEvent ) {
    let pointer = this.pointers.find( p => p.id === ev.pointerId || !p.active );
    if ( !pointer ) {
      // No more pointers to track
      return;
    }
    pointer.id = ev.pointerId;
    pointer.active = true;
  }

  // pointerdown - handle button presses
  pointerdown( ev:PointerEvent ) {
    let pointer = this.pointers.find( p => p.id === ev.pointerId && p.active );
    if ( !pointer ) {
      // Not tracking this pointer
      return;
    }
    pointer.buttonPress |= ev.buttons;
    this.pointerchange( ev );
  }

  // pointerdown / up / move - Update pointer buttons, position
  pointerchange( ev:PointerEvent ) {
    let pointer = this.pointers.find( p => p.id === ev.pointerId && p.active );
    if ( !pointer ) {
      // Not tracking this pointer
      return;
    }
    pointer.button = ev.buttons;
    pointer.x = ( ev.offsetX / this.game.canvas.clientWidth ) * 2 - 1;
    pointer.y = -( ev.offsetY / this.game.canvas.clientHeight ) * 2 + 1;
  }

  // pointer out/leave/cancel - deactivate pointer
  pointerend( ev:PointerEvent ) {
    let pointer = this.pointers.find( p => p.id === ev.pointerId );
    if ( !pointer ) {
      // Not tracking pointer
      return;
    }
    pointer.id = 0;
    pointer.active = false;
  }

  clearButtonPresses() {
    for ( const p of this.pointers ) {
      p.buttonPress = 0;
    }
  }

}
