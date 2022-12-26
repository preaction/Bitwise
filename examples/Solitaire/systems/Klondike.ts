
import * as three from 'three';
import * as shifty from 'shifty';
import { System, Entity } from '@fourstar/bitwise';
import type { Pointer } from '@fourstar/bitwise';
import { Render, Input } from '@fourstar/bitwise/system';
import { Position, Sprite } from '@fourstar/bitwise/component';
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

const raycaster = new three.Raycaster();
raycaster.layers.set(1); // XXX: Make this face-up cards
const pointer = new three.Vector3();

export default class Klondike extends System {
  Input!:Input;
  Position!:Position;
  Render!:Render;
  Foundation!:Foundation;
  Stack!:Stack;
  Sprite!:Sprite;

  tweens!:shifty.Scene;

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

  drawEntity!:Entity;
  drawEntityPath:string = "";
  discardEntity!:Entity;
  discardEntityPath:string = "";

  rowHeight:number = 0.5;

  /**
   * The card we are currently dragging
   */
  dragEntity:number = -1;

  /**
   * Other cards on top of the card we're currently dragging.
   */
  followEntities:number[] = [];

  thaw( data:{drawEntityPath: string, discardEntityPath: string} ) {
    this.drawEntityPath = data.drawEntityPath;
    this.discardEntityPath = data.discardEntityPath;
  }

  freeze():any {
    return { drawEntityPath: this.drawEntityPath, discardEntityPath: this.discardEntityPath };
  }

  async init() {
    // Get references to Components and Systems from this.scene
    this.Position = this.scene.getComponent(Position);
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
    // Sort stacks by X position
    this.stacks = this.stacks
      .map( stack => ({ stack, position: this.scene.getEntityById( stack ).getComponent( "Position" ) }) )
      .sort( (a, b) => a.position.x - b.position.x )
      .map( obj => obj.stack );

    // Add event handlers

    // Find entities
    const drawEntity = this.scene.getEntityByPath( this.drawEntityPath );
    if ( !drawEntity ) {
      throw "Missing draw entity";
    }
    this.drawEntity = drawEntity;

    const discardEntity = this.scene.getEntityByPath( this.discardEntityPath );
    if ( !discardEntity ) {
      throw "Missing discard entity";
    }
    this.discardEntity = discardEntity;

    // Load the Deck prefab textures and materials
    this.cardBackTextureId = this.scene.game.load.texture( cardBackImage );

    const drawPosition = this.drawEntity.getComponent( "Position" );
    for ( let suit = 0; suit < suits.length; suit++ ) {
      for ( let rank = 0; rank < ranks.length; rank++ ) {
        const entity = this.scene.addEntity();
        const card = {
          entity: entity.id,
          suit,
          rank,
          faceImage: this.scene.game.load.texture( `cards/card_${suits[suit]}_${ranks[rank]}.png` ),
          faceUp: false,
          stack: -1,
          foundation: -1,
        };

        entity.name = `${suits[suit]}_${ranks[rank]}`;
        entity.addComponent( "Position", {
          x: drawPosition.x,
          y: drawPosition.y,
          z: drawPosition.z,
          sx: drawPosition.sx,
          sy: drawPosition.sy,
          sz: 1,
        } );
        entity.addComponent( "Sprite", {
          textureId: this.cardBackTextureId,
        } );
        this.deckCards.push(card);
        this.cards[entity.id] = card;
      }
    }

    this.Input.watchPointer();
    this.tweens = new shifty.Scene();
  }

  start() {
    // Shuffle the deck
    const deck = this.deckCards;
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Deal it out
    for ( let row = 0; row < this.stacks.length; row++ ) {
      // Each subsequent row skips the first (row) stacks
      for ( let stackIdx = row; stackIdx < this.stacks.length; stackIdx++ ) {
        const card = this.deckCards.shift();
        if ( !card ) {
          throw "Out of cards";
        }
        this.moveToStack( card, stackIdx );
        if ( stackIdx === row ) {
          this.faceUpCard(card);
        }
      }
    }

    this.tweens.play();
    this.positionDeck();
  }

  pause() {
    this.tweens.pause();
  }

  resume() {
    this.tweens.resume();
  }

  positionDeck() {
    const drawPosition = this.drawEntity.getComponent( "Position" );
    for ( let i = this.deckCards.length - 1; i >= 0; i-- ) {
      const card = this.deckCards[i];
      this.faceDownCard( card );
      this.Position.store.x[card.entity] = drawPosition.x;
      this.Position.store.y[card.entity] = drawPosition.y;
      this.Position.store.z[card.entity] = drawPosition.z + (this.deckCards.length - i + 1);
    }
  }

  faceUpCard( card:Card ) {
    card.faceUp = true;
    // XXX: Rotating sprites doesn't work. We would have to use Plane instead
    // const position = this.Position.store;
    // const tween = shifty.tween({
    //   from: {
    //     ry: 0,
    //   },
    //   to: { ry: 1 },
    //   duration: 250,
    //   render: ( state:{ry: number} ) => {
    //     position.ry[card.entity] = state.ry;
    //   },
    // });
    // tween.then( () => { this.tweens.remove( tween ) } );
    // this.tweens.add(tween);
    this.Sprite.store.textureId[card.entity] = card.faceImage;
  }

  faceDownCard( card:Card ) {
    card.faceUp = false;
    // XXX: Rotating sprites doesn't work. We would have to use Plane instead
    // const position = this.Position.store;
    // const tween = shifty.tween({
    //   from: {
    //     ry: 0,
    //   },
    //   to: { ry: 1 },
    //   duration: 250,
    //   render: ( state:{ry: number} ) => {
    //     position.ry[card.entity] = state.ry;
    //   },
    // });
    // tween.then( () => { this.tweens.remove( tween ) } );
    // this.tweens.add(tween);
    this.Sprite.store.textureId[card.entity] = this.cardBackTextureId;
  }

  moveToDiscard( card:Card ) {
    const eid = card.entity;
    this.discardCards.unshift(card);
    this.faceUpCard( card );
    this.tweenTo(
      card.entity,
      this.Position.store.x[this.discardEntity.id],
      this.Position.store.y[this.discardEntity.id],
      this.Position.store.z[this.discardEntity.id] + this.discardCards.length,
    );
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
      this.Position.store.x[foundationId],
      this.Position.store.y[foundationId],
      this.Position.store.z[foundationId] + foundationCards.length,
    );
  }

  moveToStack( card:Card, stackIdx:number ) {
    const stackId = this.stacks[stackIdx];
    let stackCards = this.stackCards[stackIdx];
    if ( !stackCards ) {
      stackCards = this.stackCards[stackIdx] = [];
    }
    card.stack = stackIdx;
    card.foundation = -1;
    stackCards.unshift(card);
    this.tweenTo(
      card.entity,
      this.Position.store.x[stackId],
      this.Position.store.y[stackId] - (stackCards.length - 1) * this.rowHeight,
      this.Position.store.z[stackId] + stackCards.length,
    );
  }

  tweenTo( eid:number, x:number, y:number, z:number ) {
    const position = this.Position.store;
    position.z[eid] = 1000 + z;
    const tween = shifty.tween({
      from: {
        x: position.x[eid],
        y: position.y[eid],
      },
      to: { x, y },
      duration: 250,
      render: ( state:{x: number, y:number} ) => {
        position.x[eid] = state.x;
        position.y[eid] = state.y;
      },
    })
    tween.then( () => {
      position.z[eid] = z;
      this.tweens.remove(tween);
    });
    this.tweens.add(tween);
  }

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
        console.log( "WIN!" );
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
      this.followEntities = moveCards.slice(0, -1).map( card => card.entity );
    }
    else if ( card.foundation >= 0 ) {
      // Cards on foundations can be pulled back into the
      // tableau
      this.dragEntity = card.entity;
      this.followEntities = [];
      this.foundationCards[ card.foundation ].shift();
    }
    else {
      // Card must be on the discard stack
      this.discardCards.shift();
      this.dragEntity = card.entity;
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
          }
          // Any face up card is going to be dragged
          else if ( card.faceUp ) {
            this.startDragCard( card );
          }
        }
        else if ( eid === this.drawEntity.id && this.deckCards.length === 0 ) {
          // Clicked the bottom under the deck, so move the discard
          // back
          this.deckCards = this.discardCards.reverse();
          this.discardCards = [];
          this.positionDeck();
        }
      }
      else if ( p.button & 1 && this.dragEntity >= 0 ) {
        // Move the card being dragged
        pointer.unproject( this.camera );
        this.Position.store.x[this.dragEntity] = pointer.x;
        this.Position.store.y[this.dragEntity] = pointer.y;
        this.Position.store.z[this.dragEntity] = 1000;
        for ( let i = 0; i < this.followEntities.length; i++ ) {
          const eid = this.followEntities[i];
          const row = this.followEntities.length - i;
          this.Position.store.x[eid] = pointer.x;
          this.Position.store.y[eid] = pointer.y - row * this.rowHeight;
          this.Position.store.z[eid] = 1000 + row;
        }
      }
      // Otherwise, mouse up
      else if ( this.dragEntity >= 0 ) {
        // XXX: If we have only been down for less than 250ms, consider
        // it a click and try to auto-move
        // Try to drop the card where we are
        const dragCard = this.cards[ this.dragEntity ];
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
                dragCard.stack = stackCard.stack;
                dragCard.foundation = -1;
              }
            }
            else if ( this.followEntities.length === 0 && overCard.foundation >= 0 ) {
              const foundationCard = this.foundationCards[ overCard.foundation ][0];
              // If our new card is same suit and one rank higher
              if ( dragCard.suit === foundationCard.suit && dragCard.rank === foundationCard.rank + 1 ) {
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
            }
          }
          // Are we over an empty foundation?
          else if ( this.foundations.indexOf( overEid ) >= 0 ) {
            if ( ranks[ dragCard.rank ] === "A" ) {
              dragCard.stack = -1;
              dragCard.foundation = this.foundations.indexOf( overEid );
            }
          }
        }

        // Flip up the next card in the stack, if needed
        if ( fromStack >= 0 && dragCard.stack != fromStack && this.stackCards[fromStack].length ) {
          this.faceUpCard( this.stackCards[fromStack][0] );
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
