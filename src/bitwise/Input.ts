
import Game from './Game.js';

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
  }

  start() {
    this.game.canvas.tabIndex = 1;
    this.game.canvas.addEventListener( 'keydown', this._downHandler = this.keydown.bind(this) );
    this.game.canvas.addEventListener( 'keyup', this._upHandler = this.keyup.bind(this) );
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
  }

  keydown(e:KeyboardEvent) {
    if ( e.key in this.watchingKeys ) {
      this.key[e.key] = true;
    }
    if ( e.key in this.watchingKeypresses ) {
      this.keypress[ e.key ] = true;
    }
  }
  keyup(e:KeyboardEvent) {
    if ( this.key[e.key] ) {
      this.key[e.key] = false;
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
}
