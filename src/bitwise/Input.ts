
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
  watchingKeys:Object;
  watchingKeypresses:Object;

  /**
   * key holds the state of any keys added to the watch list. "true" if
   * the key is down, "false" if not.
   */
  key:Object;

  /**
   * keypress holds the keys that have been pressed since the last
   * update cycle.
   */
  keypress:Object;

  _downHandler:Function;
  _upHandler:Function;

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
    if ( this.watchKey[ e.key ] ) {
      this.key[e.key] = true;
    }
    if ( this.watchKeypress[ e.key ] ) {
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

  watchKey( key:KeyCode, alias:string=null ) {
    if ( !this.watchKey ) {
      this.watchKey[key] = new Set();
    }
    this.watchKey[key].add( alias || key );
  }
  watchKeypress( key:KeyCode, alias:string=null ) {
    if ( !this.watchKeypress ) {
      this.watchKeypress[key] = new Set();
    }
    this.watchKeypress[key].add( alias || key );
  }
  clearKeypresses() {
    this.keypress = {};
  }
}
