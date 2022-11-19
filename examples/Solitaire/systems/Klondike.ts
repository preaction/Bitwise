
import * as three from 'three';
import System from 'bitwise/System.js';
import Render from 'bitwise/system/Render.js';
import Position from 'bitwise/component/Position.js';
import Sprite from 'bitwise/component/Sprite.js';
import Entity from 'bitwise/Entity.js';
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
  Position!:Position;
  Render!:Render;
  Foundation!:Foundation;
  Stack!:Stack;
  Sprite!:Sprite;

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

  init() {
    // Get references to Components and Systems from this.scene
    this.Position = this.scene.getComponent(Position);
    this.Foundation = this.scene.getComponent(Foundation);
    this.Stack = this.scene.getComponent(Stack);
    this.Sprite = this.scene.getComponent(Sprite);
    this.Render = this.scene.getSystem(Render);

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
    cardFaceImages.forEach( cardFaceImage => {
      this.scene.game.loadTexture( cardFaceImage );
    } );
    this.scene.game.loadTexture( cardBackImage );

    const drawPosition = this.drawEntity.getComponent( "Position" );
    for ( let suit = 0; suit < suits.length; suit++ ) {
      for ( let rank = 0; rank < ranks.length; rank++ ) {
        const entity = this.scene.addEntity();
        entity.name = `${suits[suit]}_${ranks[rank]}`;
        entity.addComponent( "Position", {
          sx: drawPosition.sx,
          sy: drawPosition.sy,
          sz: 1,
        } );
        entity.addComponent( "Sprite", {
          textureId: this.scene.game.textureIds[ cardBackImage ],
        } );
        const card = {
          entity: entity.id,
          suit,
          rank,
          faceImage: this.scene.game.textureIds[ `cards/card_${suits[suit]}_${ranks[rank]}.png` ],
          faceUp: false,
          stack: -1,
          foundation: -1,
        };
        this.deckCards.push(card);
        this.cards[entity.id] = card;
      }
    }
    console.log( `Card eids: ${Object.keys(this.cards)}` );

    this.scene.game.input.watchPointer();
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

    this.positionDeck();
  }

  positionDeck() {
    const drawPosition = this.drawEntity.getComponent( "Position" );
    for ( let i = this.deckCards.length - 1; i >= 0; i-- ) {
      const card = this.deckCards[i];
      card.faceUp = false;
      this.Sprite.store.textureId[card.entity] = this.scene.game.textureIds[ cardBackImage ];
      this.Position.store.x[card.entity] = drawPosition.x;
      this.Position.store.y[card.entity] = drawPosition.y;
      this.Position.store.z[card.entity] = drawPosition.z + (this.deckCards.length - i + 1);
    }
  }

  faceUpCard( card:Card ) {
    card.faceUp = true;
    this.Sprite.store.textureId[card.entity] = card.faceImage;
  }

  moveToDiscard( card:Card ) {
    const eid = card.entity;
    this.discardCards.unshift(card);

    this.faceUpCard( card );

    this.Position.store.x[eid] = this.Position.store.x[this.discardEntity.id];
    this.Position.store.y[eid] = this.Position.store.y[this.discardEntity.id];
    this.Position.store.z[eid] = this.Position.store.z[this.discardEntity.id] + this.discardCards.length;
  }

  moveToFoundation( card:Card, foundationIdx:number ) {
    const foundation = this.scene.getEntityById( this.foundations[foundationIdx] );
    let foundationCards = this.foundationCards[foundationIdx];
    if ( !foundationCards ) {
      foundationCards = this.foundationCards[foundationIdx] = [];
    }
    const foundationPosition = foundation.getComponent( "Position" );
    card.stack = -1;
    card.foundation = foundationIdx;
    foundationCards.unshift(card);
    this.Position.store.x[card.entity] = foundationPosition.x;
    this.Position.store.y[card.entity] = foundationPosition.y - foundationCards.length * this.rowHeight;
    this.Position.store.z[card.entity] = foundationPosition.z + foundationCards.length + 1;
    this.Position.store.sx[card.entity] = foundationPosition.sx;
    this.Position.store.sy[card.entity] = foundationPosition.sy;
  }

  moveToStack( card:Card, stackIdx:number ) {
    const stack = this.scene.getEntityById( this.stacks[stackIdx] );
    let stackCards = this.stackCards[stackIdx];
    if ( !stackCards ) {
      stackCards = this.stackCards[stackIdx] = [];
    }
    const stackPosition = stack.getComponent( "Position" );
    card.stack = stackIdx;
    card.foundation = -1;
    stackCards.unshift(card);
    this.Position.store.x[card.entity] = stackPosition.x;
    this.Position.store.y[card.entity] = stackPosition.y - stackCards.length * this.rowHeight;
    this.Position.store.z[card.entity] = stackPosition.z + stackCards.length + 1;
    this.Position.store.sx[card.entity] = stackPosition.sx;
    this.Position.store.sy[card.entity] = stackPosition.sy;
  }

  returnDragCard() {
    const dragCard = this.cards[ this.dragEntity ];
    if ( dragCard.stack >= 0 ) {
      this.moveToStack( dragCard, dragCard.stack );
      for ( let i = this.followEntities.length - 1; i > 0; i-- ) {
        const eid = this.followEntities[i];
        this.moveToStack( this.cards[ eid ], dragCard.stack );
      }
    }
    else if ( dragCard.foundation >= 0 ) {
      this.moveToFoundation( dragCard, dragCard.foundation );
    }
    else {
      this.moveToDiscard( dragCard );
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

  update( timeMilli:number ) {
    // Perform updates
    const p = this.scene.game.input.pointers[0];
    if ( p.active ) {
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.z = 0;
      // Check for mouse down
      if ( p.buttonPress & 1 ) {
        // Check for a card under the cursor and start dragging it
        raycaster.setFromCamera( pointer, this.camera );
        const intersects = raycaster.intersectObjects( this.scene._scene.children, true );
        if ( intersects.length > 0 ) {
          const selected = intersects[0].object;
          const eid = selected.userData.eid;
          const card = this.cards[eid];
          if ( card ) {
            // Card face down in deck gets flipped face up on discard
            if ( !card.faceUp && card.stack < 0 ) {
              this.deckCards.shift();
              this.moveToDiscard( card );
            }
            // Any face up card is going to be dragged
            else if ( card.faceUp ) {
              if ( card.stack >= 0 ) {
                // Card can only be dragged if it's part of a run
                const cardIdx = this.stackCards[ card.stack ].indexOf( card );
                const moveCards = this.stackCards[ card.stack ].splice( 0, cardIdx + 1 );
                this.dragEntity = eid;
                this.followEntities = moveCards.slice(0, -1).map( card => card.entity );
              }
              else if ( card.foundation >= 0 ) {
                // Cards on foundations can be pulled back into the
                // tableau
                this.dragEntity = eid;
                this.followEntities = [];
                this.foundationCards[ card.foundation ].shift();
              }
              else {
                // Card must be on the discard stack
                this.dragEntity = eid;
                this.followEntities = [];
              }
            }
          }
          else if ( eid === this.drawEntity && this.deckCards.length === 0 ) {
            // Clicked the bottom under the deck, so move the discard
            // back
            this.deckCards = this.discardCards.reverse();
            this.discardCards = [];
            this.positionDeck();
          }
        }
      }
      else if ( p.button & 1 && this.dragEntity >= 0 ) {
        // Move the card being dragged
        pointer.unproject( this.camera );
        this.Position.store.x[this.dragEntity] = pointer.x;
        this.Position.store.y[this.dragEntity] = pointer.y;
        this.Position.store.z[this.dragEntity] = 2000;
        for ( let i = 0; i < this.followEntities.length; i++ ) {
          const eid = this.followEntities[i];
          const row = this.followEntities.length - i;
          this.Position.store.x[eid] = pointer.x;
          this.Position.store.y[eid] = pointer.y + row * this.rowHeight;
          this.Position.store.z[eid] = 2000 + row;
        }
      }
      // Otherwise, mouse up
      else if ( this.dragEntity >= 0 ) {
        // Try to drop the card where we are
        const dragCard = this.cards[ this.dragEntity ];
        const fromStack = dragCard.stack;
        let dropped = false;
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
                this.moveToStack( dragCard, stackCard.stack );
                dropped = true;
              }
            }
            else if ( overCard.foundation >= 0 ) {
              const foundationCard = this.foundationCards[ overCard.foundation ][0];
              // If our new card is same suit and one rank higher
              if ( dragCard.suit === foundationCard.suit && dragCard.rank === foundationCard.rank + 1 ) {
                this.moveToFoundation( dragCard, overCard.foundation );
                // XXX: Check if we win the game
                dropped = true;
              }
            }
          }
          // Are we over an empty stack?
          else if ( this.stacks.indexOf( overEid ) >= 0 ) {
            if ( ranks[ dragCard.rank ] === "K" ) {
              this.moveToStack( dragCard, this.stacks.indexOf( overEid ) );
              dropped = true;
            }
          }
          // Are we over an empty foundation?
          else if ( this.foundations.indexOf( overEid ) >= 0 ) {
            if ( ranks[ dragCard.rank ] === "A" ) {
              this.moveToFoundation( dragCard, this.foundations.indexOf( overEid ) );
              dropped = true;
            }
          }
        }
        if ( dropped ) {
          // Flip up the next card in the stack, if needed
          if ( fromStack >= 0 && this.stackCards[fromStack].length ) {
            this.faceUpCard( this.stackCards[fromStack][0] );
          }
        }
        else {
          this.returnDragCard();
        }
      }
    }
  }

  static get editorComponent():string {
    // Path to the .vue component, if any
    return 'systems/Klondike.vue';
  }
}
