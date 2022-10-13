
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
  constructor( game:Game ) {
    this.game = game;
    if ( game.canvas ) {
      game.canvas.tabIndex = 1;
    }
  }
  on( event:string, fn:(e:Event) => void ) {
    this.game.canvas.addEventListener( event, fn );
  }
  off( event:string, fn:(e:Event) => void ) {
    this.game.canvas.removeEventListener( event, fn );
  }
}
