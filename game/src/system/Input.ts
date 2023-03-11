
import System from '../System.js';
import Scene from '../Scene.js';

/**
 * The Pointer object tracks a single pointer's position and button
 * state.
 */
export type Pointer = {
  id: number,
  active: boolean,
  x: number,
  y: number,
  button: number,
  buttonPress: number,
};

/**
 * The Input system handles pointer (mouse or touch) and keyboard input.
 * First, choose what input to track by calling one of the watch
 * commands. Then, the state of that input can be queried on the state
 * properties.
 */
export default class Input extends System {
  protected watchingKeys:{ [key:string]: Set<string> } = {};
  protected watchingKeypresses:{ [key:string]: Set<string> } = {};

  /**
   * key holds the state of any keys added to the watch list. "true" if
   * the key is down, "false" if not.
   * @category state
   */
  key:{ [key:string]: boolean } = {};

  /**
   * keypress holds the keys that have been pressed since the last
   * update cycle. Once the update cycle is finished, the keypress is
   * removed until the key is up and then down again.
   * @category state
   */
  keypress:{ [key:string]: boolean } = {};

  /**
   * The pointers array has the state of all the pointers that can be
   * tracked. A mouse pointer is considered active while it is over the
   * game canvas. A touch pointer is considered active while it is
   * pressed.
   * @category state
   */
  pointers:Pointer[] = [];

  /**
   * The registered DOM event handlers being managed by this system.
   */
  private handlers: {[key: string]: Function} = {};

  constructor( name:string, scene:Scene ) {
    super(name, scene);
  }

  /**
   * Start collecting input from the game canvas.
   * @category lifecycle
   */
  start() {
    this.scene.addEventListener( 'afterRender', this.clearKeypresses.bind(this) );
    this.scene.addEventListener( 'afterRender', this.clearButtonPresses.bind(this) );
    this.scene.game.canvas.tabIndex = 1;
    this.scene.game.canvas.addEventListener( 'keydown', this.handlers.keydown = this.keydown.bind(this) );
    this.scene.game.canvas.addEventListener( 'keyup', this.handlers.keyup = this.keyup.bind(this) );
    this.scene.game.canvas.addEventListener( 'pointerover', this.handlers.pointerover = this.pointerbegin.bind(this) );
    this.scene.game.canvas.addEventListener( 'pointerenter', this.handlers.pointerenter = this.pointerbegin.bind(this) );
    this.scene.game.canvas.addEventListener( 'pointerdown', this.handlers.pointerdown = this.pointerdown.bind(this) );
    this.scene.game.canvas.addEventListener( 'pointermove', this.handlers.pointermove = this.pointerchange.bind(this) );
    this.scene.game.canvas.addEventListener( 'pointerup', this.handlers.pointerup = this.pointerchange.bind(this) );
    this.scene.game.canvas.addEventListener( 'pointercancel', this.handlers.pointercancel = this.pointerend.bind(this) );
    this.scene.game.canvas.addEventListener( 'pointerout', this.handlers.pointerout = this.pointerend.bind(this) );
    this.scene.game.canvas.addEventListener( 'pointerleave', this.handlers.pointerleave = this.pointerend.bind(this) );
    this.scene.game.canvas.style.touchAction = "none";
  }

  /**
   * Stop collecting input from the game canvas. No further changes will
   * be made to the input monitors.
   * @category lifecycle
   */
  stop() {
    for ( const eventName in this.handlers ) {
      if ( !this.handlers[eventName] ) {
        continue;
      }
      this.scene.game.canvas.removeEventListener( eventName, this.handlers[eventName] );
      delete this.handlers[eventName];
    }
  }

  protected keydown(e:KeyboardEvent) {
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

  protected keyup(e:KeyboardEvent) {
    if ( e.key in this.watchingKeys ) {
      for ( const alias of this.watchingKeys[e.key] ) {
        this.key[alias] = false;
      }
    }
  }

  /**
   * Add your own custom event listener to the game canvas element.
   * @category watch
   */
  on( event:string, fn:(e:Event) => void ) {
    // XXX: This handler should be managed: it should be added if/when
    // the system is started, and removed when the system is stopped.
    this.scene.game.canvas.addEventListener( event, fn );
  }

  /**
   * Remove your custom event listener from the game canvas element.
   * @category watch
   */
  off( event:string, fn:(e:Event) => void ) {
    // XXX: This handler should be managed: it should be added if/when
    // the system is started, and removed when the system is stopped.
    this.scene.game.canvas.removeEventListener( event, fn );
  }

  /**
   * Register a key to watch. Watched keys are recorded in the {@link keys}
   * property: A value of "true" means the key is down.
   *
   * Key values come from the browser's KeyboardEvent
   * (https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values).
   *
   * An alias can be given to assign the key a purpose: "Jump" or
   * "Fire". This makes it easier to customize the keys: The game code
   * watches the key with the alias and then uses the alias everywhere
   * else it needs to refer to that key.
   *
   * @param key The key to watch.
   * @param alias An alias to give the key.
   * @category watch
   */
  watchKey( key:string, alias:string='' ) {
    if ( !(key in this.watchingKeys) ) {
      this.watchingKeys[key] = new Set();
    }
    this.watchingKeys[key].add( alias || key );
  }

  /**
   * Register a key to watch for presses. Similar to {@link watchKey}, watched
   * key pressed will be recorded in the {@link keypress} property: A value of
   * "true" means the key's state changed to "down" during this update
   * cycle. Once the current update cycle is complete, the key is no
   * longer considered pressed unless the key goes "up" and then "down"
   * again.
   *
   * Key values come from the browser's KeyboardEvent
   * (https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values).
   *
   * An alias can be given to assign the key a purpose: "Jump" or
   * "Fire". This makes it easier to customize the keys: The game code
   * watches the key with the alias and then uses the alias everywhere
   * else it needs to refer to that key.
   *
   * @param key The key to watch.
   * @param alias An alias to give the key.
   * @category watch
   */
  watchKeypress(key: string, alias: string = '') {
    if (!(key in this.watchingKeypresses)) {
      this.watchingKeypresses[key] = new Set();
    }
    this.watchingKeypresses[key].add(alias || key);
  }

  protected clearKeypresses() {
    this.keypress = {};
  }

  /**
   * Register pointer(s) to watch. By default, all pointers will be
   * tracked when this method is called, though a maximum number of
   * pointers to track can be provided (any additional pointers on the
   * device will be ignored).
   *
   * Pointer state is tracked in the {@link pointers} array of Pointer
   * objects.
   * @category watch
   */
  watchPointer( count:number=0 ) {
    if ( !count ) {
      count = isNaN(navigator.maxTouchPoints) ? 0 : navigator.maxTouchPoints;
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

  protected pointerbegin( ev:PointerEvent ) {
    let pointer = this.pointers.find( p => p.id === ev.pointerId || !p.active );
    if ( !pointer ) {
      // No more pointers to track
      return;
    }
    pointer.id = ev.pointerId;
    pointer.active = true;
  }

  protected pointerdown( ev:PointerEvent ) {
    let pointer = this.pointers.find( p => p.id === ev.pointerId || !p.active );
    if ( !pointer ) {
      // Not tracking this pointer
      return;
    }
    if ( !pointer.active ) {
      // The pointerbegin event for this pointer was missed, likely
      // because the pointer was already over the canvas when the Input
      // system was started, so fire it now.
      this.pointerbegin( ev );
    }
    pointer.buttonPress |= ev.buttons;
    this.pointerchange( ev );
    this.scene.game.canvas.setPointerCapture(ev.pointerId);
  }

  protected pointerchange( ev:PointerEvent ) {
    let pointer = this.pointers.find( p => p.id === ev.pointerId || !p.active );
    if ( !pointer ) {
      // Not tracking this pointer
      return;
    }
    if ( !pointer.active ) {
      // The pointerbegin event for this pointer was missed, likely
      // because the pointer was already over the canvas when the Input
      // system was started, so fire it now.
      this.pointerbegin( ev );
    }
    ev.preventDefault();
    pointer.button = ev.buttons;
    pointer.x = ( ev.offsetX / this.scene.game.canvas.clientWidth ) * 2 - 1;
    pointer.y = -( ev.offsetY / this.scene.game.canvas.clientHeight ) * 2 + 1;
  }

  protected pointerend( ev:PointerEvent ) {
    let pointer = this.pointers.find( p => p.id === ev.pointerId );
    if ( !pointer ) {
      // Not tracking pointer
      return;
    }
    pointer.id = 0;
    pointer.active = false;
  }

  protected clearButtonPresses() {
    for ( const p of this.pointers ) {
      p.buttonPress = 0;
    }
  }

}
