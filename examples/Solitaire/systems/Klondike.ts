
import * as three from 'three';
import * as shifty from 'shifty';
import { System, Entity } from '@fourstar/bitwise';
import type { Pointer } from '@fourstar/bitwise';
import { Render, Input } from '@fourstar/bitwise/system';
import { Transform, Sprite } from '@fourstar/bitwise/component';
import Foundation from '../components/Foundation.js';
import Stack from '../components/Stack.js';

// Black is odd, Red is even
const suits = [
  "clubs", "hearts", "spades", "diamonds",
];
// Ranks in order from lowest to highest
const ranks = [
  "A", "02", "03", "04", "05", "06",
  "07", "08", "09", "10", "J", "Q", "K",
];

const cardFaceImages = suits.map( s => ranks.map( r => `cards/card_${s}_${r}.png` ) ).flat(1);
const cardBackImage = "cards/card_back.png";

type Card = {
  suit:number, // Index into the suits array
  rank:number, // Index into the ranks array
  faceUp:boolean,
  faceImage:number, // Texture ID
  entity:number,
  stack:number,
  foundation:number,
};

type Location = {
  deck?: boolean,
  discard?: boolean,
  stack?: number,
  foundation?: number,
};

type UndoItem = {
  card: Card,
  from: Location,
  to: Location,
  flip?: boolean,
};

const raycaster = new three.Raycaster();
raycaster.layers.set(1); // XXX: Make this face-up cards
const pointer = new three.Vector3();

export default class Klondike extends System {
  Input!:Input;
  Transform!:Transform;
  Render!:Render;
  Foundation!:Foundation;
  Stack!:Stack;
  Sprite!:Sprite;

  tweens!:shifty.Scene;

  /**
   * The deck at the start of the game. Used to replay the game.
   */
  gameDeck:Card[] = [];

  /**
   * An array of foundation base entity IDs, from left to right.
   */
  foundations:number[] = [];
  foundationCards:Card[][] = [];

  /**
   * An array of stack base entity IDs, from left to right.
   */
  stacks:number[] = [];
  stackCards:Card[][] = [];

  cards:{ [key:number]: Card } = {};
  deckCards:Card[] = [];
  discardCards:Card[] = [];
  cardBackTextureId:number = -1;

  /**
   * A stack of steps that have been taken by the user. Each move is
   * only one card. The undo() function will automatically move any
   * cards on top of the card being moved.
   */
  undoStack:UndoItem[] = [];

  deckEntity!:Entity;
  deckEntityPath:string = "";
  discardEntity!:Entity;
  discardEntityPath:string = "";
  menuEntity!:Entity;
  menuEntityPath:string = "";
  winEntity!:Entity;
  winEntityPath:string = "";

  rowHeight:number = 0.5;

  /**
   * The card we are currently dragging
   */
  dragEntity:number = -1;

  /**
   * The location where we got the card we're dragging
   */
  dragFrom:Location = {};

  /**
   * Other cards on top of the card we're currently dragging.
   */
  followEntities:number[] = [];

  thaw( data:{deckEntityPath: string, discardEntityPath: string, menuEntityPath: string} ) {
    // XXX: Annoying to define all system fields in thaw and freeze...
    this.deckEntityPath = data.deckEntityPath;
    this.discardEntityPath = data.discardEntityPath;
    this.menuEntityPath = data.menuEntityPath;
    this.winEntityPath = data.winEntityPath;
  }

  freeze():any {
    // XXX: Annoying to define all system fields in thaw and freeze...
    return {
      deckEntityPath: this.deckEntityPath,
      discardEntityPath: this.discardEntityPath,
      menuEntityPath: this.menuEntityPath,
      winEntityPath: this.winEntityPath,
    };
  }

  async init() {
    // Get references to Components and Systems from this.scene
    this.Transform = this.scene.getComponent(Transform);
    this.Foundation = this.scene.getComponent(Foundation);
    this.Stack = this.scene.getComponent(Stack);
    this.Sprite = this.scene.getComponent(Sprite);
    this.Render = this.scene.getSystem(Render);
    this.Input = this.scene.getSystem(Input);

    // Create queries with bitecs.Query
    const foundationQuery = this.defineQuery([ this.Foundation ]);
    this.foundations = foundationQuery(this.world);
    this.removeQuery( foundationQuery );

    const stackQuery = this.defineQuery([ this.Stack ]);
    this.stacks = stackQuery(this.world);
    this.removeQuery( stackQuery );
    // Sort stacks by X Transform
    this.stacks = this.stacks
      .map( stack => ({ stack, transform: this.scene.getEntityById( stack ).getComponent( "Transform" ) }) )
      .sort( (a, b) => a.transform.x - b.transform.x )
      .map( obj => obj.stack );

    // Add event handlers

    // Find entities
    const deckEntity = this.scene.getEntityByPath( this.deckEntityPath );
    if ( !deckEntity ) {
      throw "Missing deck entity";
    }
    this.deckEntity = deckEntity;

    const discardEntity = this.scene.getEntityByPath( this.discardEntityPath );
    if ( !discardEntity ) {
      throw "Missing discard entity";
    }
    this.discardEntity = discardEntity;

    const menuEntity = this.scene.getEntityByPath( this.menuEntityPath );
    if ( !menuEntity ) {
      throw `Missing menu entity: ${this.menuEntityPath}`;
    }
    this.menuEntity = menuEntity;

    const winEntity = this.scene.getEntityByPath( this.winEntityPath );
    if ( !winEntity ) {
      throw `Missing win entity: ${this.winEntityPath}`;
    }
    this.winEntity = winEntity;

    // Load the Deck prefab textures and materials
    this.cardBackTextureId = this.scene.game.load.texture( cardBackImage );

    const promises = [] as Promise<any>[];
    const deckTransform = this.deckEntity.getComponent( "Transform" );
    for ( let suit = 0; suit < suits.length; suit++ ) {
      for ( let rank = 0; rank < ranks.length; rank++ ) {
        const entity = this.scene.addEntity();
        entity.active = true;
        const card = {
          entity: entity.id,
          suit,
          rank,
          faceImage: this.scene.game.load.texture( `cards/card_${suits[suit]}_${ranks[rank]}.png` ),
          faceUp: false,
          stack: -1,
          foundation: -1,
        };
        promises.push( this.Render.loadTexture( card.faceImage ) );

        entity.name = `${suits[suit]}_${ranks[rank]}`;
        entity.addComponent( "Transform", {
          x: deckTransform.x,
          y: deckTransform.y,
          z: deckTransform.z,
          sx: deckTransform.sx,
          sy: deckTransform.sy,
          sz: 1,
        } );
        entity.addComponent( "Sprite", {
          textureId: this.cardBackTextureId,
        } );
        this.gameDeck.push(card);
        this.cards[entity.id] = card;
      }
    }

    this.Input.watchPointer();
    this.tweens = new shifty.Scene();

    // Prepare UI actions
    this.Render.addUIAction( "showMenu", this.showMenu.bind(this) );
    this.Render.addUIAction( "hideMenu", this.hideMenu.bind(this) );
    this.Render.addUIAction( "newGame", this.newGame.bind(this) );
    this.Render.addUIAction( "restartGame", this.restartGame.bind(this) );
    this.Render.addUIAction( "undo", this.undo.bind(this) );

    return promises;
  }

  newGame() {
    this.hideMenu();
    this.resetGame();
    this.shuffleDeck();
    this.dealTableau();
  }

  restartGame() {
    this.hideMenu();
    this.resetGame();
    this.dealTableau();
  }

  shuffleDeck() {
    const deck = this.gameDeck;
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  resetGame() {
    this.stackCards = [];
    this.deckCards = [];
    this.discardCards = [];
    for ( const card of this.gameDeck ) {
      card.faceUp = false;
      card.stack = -1;
      card.foundation = -1;
    }
    this.deckCards = [...this.gameDeck];
    this.placeDeck();
    this.winEntity.active = false;
  }

  dealTableau() {
    const delayStep = 50; // ms
    let delay = 0;
    this.deckCards = [...this.gameDeck];
    this.placeDeck();
    // Deal it out
    for ( let row = 0; row < this.stacks.length; row++ ) {
      // Each subsequent row skips the first (row) stacks
      for ( let stackIdx = row; stackIdx < this.stacks.length; stackIdx++ ) {
        const card = this.deckCards.shift();
        if ( !card ) {
          throw "Out of cards";
        }
        this.moveToStack( card, stackIdx, delay ).then( () => {
          if ( stackIdx === row ) {
            this.faceUpCard(card);
          }
        });
        delay += delayStep;
      }
    }
  }

  start() {
    this.tweens.play();
    this.newGame();
  }

  pause() {
    this.tweens.pause();
  }

  resume() {
    this.tweens.resume();
  }

  stop() {
    this.tweens.stop();
    this.tweens.empty();
    
  }

  showMenu() {
    this.menuEntity.active = true;
  }

  hideMenu() {
    this.menuEntity.active = false;
  }

  addUndoItem( card:Card, from:Location, to:Location, flip:boolean=false ) {
    this.undoStack.unshift(
      { card, from, to, flip },
    );
  }

  /**
   * Remove the top item from the undoStack and reverse the change
   * inside.
   */
  undo() {
    const undo = this.undoStack.shift();
    if ( !undo ) {
      return;
    }

    console.log( 'Undoing: ', undo );

    // Special case: Deck was flipped from discard
    if ( undo.to.deck ) {

      return;
    }

    // Remove the card from its current location
    if ( undo.to.discard ) {
      this.discardCards.shift();
    }
    else if ( undo.to.foundation !== undefined && undo.to.foundation >= 0 ) {
      this.foundationCards[undo.to.foundation].shift();
      this.dragEntity = undo.card.entity;
    }
    else if ( undo.to.stack !== undefined && undo.to.stack >= 0 ) {
      // Find the card in the stack and add any followEntities
      const cardIdx = this.stackCards[ undo.to.stack ].indexOf(undo.card);
      const moveCards = this.stackCards[ undo.to.stack ].splice( 0, cardIdx + 1 );
      this.followEntities = moveCards.slice(0, -1).map( card => card.entity );
      this.dragEntity = undo.card.entity;
      console.log( 'Undo to cards after undo: ', undo.to.stack, this.stackCards[ undo.to.stack ] );
    }

    // Restore the card to its former location
    if ( undo.from.deck ) {
      this.dragEntity = -1;
      // Move back to deck
      this.moveToDeck(undo.card);
    }
    else if ( undo.from.foundation !== undefined && undo.from.foundation >= 0 ) {
      // Move card back to foundation. Must only be one card.
      undo.card.foundation = undo.from.foundation;
      this.dropCard();
    }
    else if ( undo.from.stack !== undefined && undo.from.stack >= 0 ) {
      // Move card back to stack.
      // Follow entities have already been set from above
      if ( undo.flip ) {
        this.faceDownCard( this.stackCards[ undo.from.stack ][0] );
      }
      undo.card.stack = undo.from.stack;
      this.dropCard();
      console.log( 'Undo from cards after undo: ', undo.from.stack, this.stackCards[ undo.from.stack ] );
    }
    else if ( undo.from.discard ) {
      this.dragEntity = -1;
      // Move card back to discard.
      this.moveToDiscard(undo.card);
    }
  }

  placeDeck() {
    const deckTransform = this.deckEntity.getComponent( "Transform" );
    for ( let i = this.deckCards.length - 1; i >= 0; i-- ) {
      const card = this.deckCards[i];
      this.faceDownCard( card );
      this.Transform.store.x[card.entity] = deckTransform.x;
      this.Transform.store.y[card.entity] = deckTransform.y;
      this.Transform.store.z[card.entity] = deckTransform.z + (this.deckCards.length - i + 1);
    }
  }

  faceUpCard( card:Card ) {
    card.faceUp = true;
    // XXX: Rotating sprites doesn't work. We would have to use Plane instead
    // const Transform = this.Transform.store;
    // const tween = shifty.tween({
    //   from: {
    //     ry: 0,
    //   },
    //   to: { ry: 1 },
    //   duration: 250,
    //   render: ( state:{ry: number} ) => {
    //     Transform.ry[card.entity] = state.ry;
    //   },
    // });
    // tween.then( () => { this.tweens.remove( tween ) } );
    // this.tweens.add(tween);
    this.Sprite.store.textureId[card.entity] = card.faceImage;
  }

  faceDownCard( card:Card ) {
    card.faceUp = false;
    // XXX: Rotating sprites doesn't work. We would have to use Plane instead
    // const Transform = this.Transform.store;
    // const tween = shifty.tween({
    //   from: {
    //     ry: 0,
    //   },
    //   to: { ry: 1 },
    //   duration: 250,
    //   render: ( state:{ry: number} ) => {
    //     Transform.ry[card.entity] = state.ry;
    //   },
    // });
    // tween.then( () => { this.tweens.remove( tween ) } );
    // this.tweens.add(tween);
    this.Sprite.store.textureId[card.entity] = this.cardBackTextureId;
  }

  moveToDiscard( card:Card ) {
    const eid = card.entity;
    card.stack = -1;
    card.foundation = -1;
    this.discardCards.unshift(card);
    this.faceUpCard( card );
    // Make sure this card is above both the deck and the discard stack
    this.Transform.store.z[card.entity] += this.discardCards.length;
    this.tweenTo(
      card.entity,
      this.Transform.store.x[this.discardEntity.id],
      this.Transform.store.y[this.discardEntity.id],
      this.Transform.store.z[this.discardEntity.id] + this.discardCards.length,
    );
  }

  moveToDeck( card:Card ) {
    const eid = card.entity;
    card.stack = -1;
    card.foundation = -1;
    this.deckCards.unshift(card);
    // Make sure this card is above both the deck and the discard stack
    this.Transform.store.z[card.entity] += this.deckCards.length;
    this.tweenTo(
      card.entity,
      this.Transform.store.x[this.deckEntity.id],
      this.Transform.store.y[this.deckEntity.id],
      this.Transform.store.z[this.deckEntity.id] + this.deckCards.length,
    ).then( () => {
      console.log( `Facing down` );
      this.faceDownCard( card );
    });
  }

  moveToFoundation( card:Card, foundationIdx:number ) {
    const foundationId = this.foundations[foundationIdx];
    let foundationCards = this.foundationCards[foundationIdx];
    if ( !foundationCards ) {
      foundationCards = this.foundationCards[foundationIdx] = [];
    }
    card.stack = -1;
    card.foundation = foundationIdx;
    foundationCards.unshift(card);
    this.tweenTo(
      card.entity,
      this.Transform.store.x[foundationId],
      this.Transform.store.y[foundationId],
      this.Transform.store.z[foundationId] + foundationCards.length,
    );
  }

  moveToStack( card:Card, stackIdx:number, delay:number=0 ):Promise<any> {
    const stackId = this.stacks[stackIdx];
    let stackCards = this.stackCards[stackIdx];
    if ( !stackCards ) {
      stackCards = this.stackCards[stackIdx] = [];
    }
    card.stack = stackIdx;
    card.foundation = -1;
    stackCards.unshift(card);
    return this.tweenTo(
      card.entity,
      this.Transform.store.x[stackId],
      this.Transform.store.y[stackId] - (stackCards.length - 1) * this.rowHeight,
      this.Transform.store.z[stackId] + stackCards.length,
      delay,
    );
  }

  tweenTo( eid:number, x:number, y:number, z:number, delay:number=0 ):Promise<any> {
    const Transform = this.Transform.store;
    Transform.z[eid] = Math.max( Transform.z[eid] + 52, z + 52 );
    const tween = shifty.tween({
      from: {
        x: Transform.x[eid],
        y: Transform.y[eid],
      },
      to: { x, y },
      delay,
      duration: 250, // ms
      render: ( state:{x: number, y:number, z:number} ) => {
        Transform.x[eid] = state.x;
        Transform.y[eid] = state.y;
      },
    })
    return this.tweens.add(tween).then( () => {
      console.log( `Tween complete` );
      Transform.z[eid] = z;
      this.tweens.remove(tween);
    });
  }

  /**
   * Drop the current card being dragged. This assumes the Card object
   * for the dragged entity has been updated with the new location of
   * the card. Any followEntities will be updated as well.
   */
  dropCard() {
    const dragCard = this.cards[ this.dragEntity ];
    if ( dragCard.stack >= 0 ) {
      this.moveToStack( dragCard, dragCard.stack );
      for ( let i = this.followEntities.length - 1; i >= 0; i-- ) {
        const eid = this.followEntities[i];
        this.moveToStack( this.cards[ eid ], dragCard.stack );
      }
    }
    else if ( dragCard.foundation >= 0 ) {
      this.moveToFoundation( dragCard, dragCard.foundation );
      if ( !this.foundations.find( (f, i) => this.foundationCards[i]?.[0]?.rank != ranks.indexOf("K") ) ) {
        this.winEntity.active = true;
      }
    }
    else {
      this.moveToDiscard( dragCard );
    }

    // Update layer settings so cards can be selected again
    for ( const eid of [ this.dragEntity, ...this.followEntities ] ) {
      const sprite = this.Render.getRenderObject(eid);
      if ( !sprite ) {
        continue;
      }
      sprite.layers.enable(1);
    }
    this.dragEntity = -1;
    this.followEntities = [];
  }

  _camera!:three.OrthographicCamera;
  get camera():three.OrthographicCamera {
    if ( !this._camera ) {
      const camera = this.Render.cameras[this.Render.mainCamera];
      if ( !camera ) {
        throw "No main camera found";
      }
      this._camera = camera;
    }
    return this._camera;
  }

  startDragCard( card:Card ) {
    if ( card.stack >= 0 ) {
      // Card can only be dragged if it's part of a run
      const cardIdx = this.stackCards[ card.stack ].indexOf( card );
      const moveCards = this.stackCards[ card.stack ].splice( 0, cardIdx + 1 );
      this.dragEntity = card.entity;
      this.dragFrom = { stack: card.stack };
      this.followEntities = moveCards.slice(0, -1).map( card => card.entity );
    }
    else if ( card.foundation >= 0 ) {
      // Cards on foundations can be pulled back into the
      // tableau
      this.dragEntity = card.entity;
      this.dragFrom = { foundation: card.foundation };
      this.followEntities = [];
      this.foundationCards[ card.foundation ].shift();
    }
    else {
      // Card must be on the discard stack
      this.discardCards.shift();
      this.dragEntity = card.entity;
      this.dragFrom = { discard: true };
      this.followEntities = [];
    }

    // Update layer settings so cards are invisible when dropping
    for ( const eid of [ this.dragEntity, ...this.followEntities ] ) {
      const sprite = this.Render.getRenderObject(eid);
      if ( !sprite ) {
        continue;
      }
      sprite.layers.disable(1);
    }
  }

  getEntityAtPointer( pointer:three.Vector3 ):number|null {
    // XXX: This should probably be moved to the Render system
    raycaster.setFromCamera( pointer, this.camera );
    const intersects = raycaster.intersectObjects( this.scene._scene.children, true );
    if ( intersects.length > 0 ) {
      const selected = intersects[0].object;
      return selected.userData.eid || null;
    }
    return null;
  }

  update( timeMilli:number ) {
    // Perform updates
    const p = this.Input?.pointers?.[0];
    if ( p?.active || this.dragEntity >= 0 ) {
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.z = 0;
      // Check for mouse down
      if ( p.buttonPress & 1 ) {
        const eid = this.getEntityAtPointer( pointer );
        if ( eid && this.cards[eid] ) {
          const card = this.cards[eid];
          // Card face down in deck gets flipped face up on discard
          if ( !card.faceUp && card.stack < 0 ) {
            this.deckCards.shift();
            this.moveToDiscard( card );
            this.addUndoItem( card, { deck: true }, { discard: true } );
          }
          // Any face up card is going to be dragged
          else if ( card.faceUp ) {
            this.startDragCard( card );
          }
        }
        else if ( eid === this.deckEntity.id && this.deckCards.length === 0 ) {
          // Clicked the bottom under the deck, so move the discard
          // back
          this.addUndoItem( this.discardCards[0], { discard: true }, { deck: true } );
          this.deckCards = this.discardCards.reverse();
          this.discardCards = [];
          this.placeDeck();
        }
      }
      else if ( p.button & 1 && this.dragEntity >= 0 ) {
        // Move the card being dragged
        pointer.unproject( this.camera );
        this.Transform.store.x[this.dragEntity] = pointer.x;
        this.Transform.store.y[this.dragEntity] = pointer.y;
        this.Transform.store.z[this.dragEntity] = 1000;
        for ( let i = 0; i < this.followEntities.length; i++ ) {
          const eid = this.followEntities[i];
          const row = this.followEntities.length - i;
          this.Transform.store.x[eid] = pointer.x;
          this.Transform.store.y[eid] = pointer.y - row * this.rowHeight;
          this.Transform.store.z[eid] = 1000 + row;
        }
      }
      // Otherwise, mouse up
      else if ( this.dragEntity >= 0 ) {
        // XXX: If we have only been down for less than 250ms, consider
        // it a click and try to auto-move
        // Try to drop the card where we are
        const dragCard = this.cards[ this.dragEntity ];
        const undoItem:UndoItem = { from: this.dragFrom, card: dragCard, to: {} }
        const fromStack = dragCard.stack;
        raycaster.setFromCamera( pointer, this.camera );
        const intersects = raycaster.intersectObjects( this.scene._scene.children, true );
        if ( intersects.length > 0 ) {
          const overEid = intersects[0].object.userData.eid;
          const overCard = this.cards[overEid];
          // Are we over a card?
          if ( overCard ) {
            if ( overCard.stack >= 0 ) {
              const stackCard = this.stackCards[overCard.stack][0];
              // If our new card is alternate suit and one rank lower
              if (
                dragCard.suit % 2 !== stackCard.suit % 2 &&
                dragCard.rank === stackCard.rank - 1
              ) {
                undoItem.to = { stack: stackCard.stack };
                dragCard.stack = stackCard.stack;
                dragCard.foundation = -1;
              }
            }
            else if ( this.followEntities.length === 0 && overCard.foundation >= 0 ) {
              const foundationCard = this.foundationCards[ overCard.foundation ][0];
              // If our new card is same suit and one rank higher
              if ( dragCard.suit === foundationCard.suit && dragCard.rank === foundationCard.rank + 1 ) {
                undoItem.to = { foundation: foundationCard.foundation };
                dragCard.stack = -1;
                dragCard.foundation = foundationCard.foundation;
              }
            }
          }
          // Are we over an empty stack?
          else if ( this.stacks.indexOf( overEid ) >= 0 ) {
            if ( ranks[ dragCard.rank ] === "K" ) {
              dragCard.stack = this.stacks.indexOf( overEid );
              dragCard.foundation = -1;
              undoItem.to = { stack: dragCard.stack };
            }
          }
          // Are we over an empty foundation?
          else if ( this.foundations.indexOf( overEid ) >= 0 ) {
            if ( ranks[ dragCard.rank ] === "A" ) {
              dragCard.stack = -1;
              dragCard.foundation = this.foundations.indexOf( overEid );
              undoItem.to = { foundation: dragCard.foundation };
            }
          }
        }

        // Flip up the next card in the stack, if needed
        if ( fromStack >= 0 && dragCard.stack != fromStack && this.stackCards[fromStack].length ) {
          this.faceUpCard( this.stackCards[fromStack][0] );
          undoItem.flip = true;
        }

        // If we found a place to go...
        if ( Object.keys( undoItem.to ).length > 0 ) {
          this.addUndoItem( undoItem.card, undoItem.from, undoItem.to, undoItem.flip );
        }
        this.dropCard();
      }
    }
  }

  static get editorComponent():string {
    // Path to the .vue component, if any
    return 'systems/Klondike.vue';
  }
}
