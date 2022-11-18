
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
        const stack = this.scene.getEntityById( this.stacks[stackIdx] );
        const stackPosition = stack.getComponent( "Position" );
        const card = this.deckCards.shift();
        if ( !card ) {
          throw "Out of cards";
        }
        if ( stackIdx === row ) {
          card.faceUp = true;
          this.Sprite.store.textureId[card.entity] = card.faceImage;
        }
        card.stack = stackIdx;
        this.Position.store.x[card.entity] = stackPosition.x;
        this.Position.store.y[card.entity] = stackPosition.y - row * this.rowHeight;
        this.Position.store.z[card.entity] = stackPosition.z + row + 1;
        this.Position.store.sx[card.entity] = stackPosition.sx;
        this.Position.store.sy[card.entity] = stackPosition.sy;
      }
    }

    // Place deck
    const drawPosition = this.drawEntity.getComponent( "Position" );
    for ( let i = this.deckCards.length - 1; i >= 0; i-- ) {
      const card = this.deckCards[i];
      this.Position.store.x[card.entity] = drawPosition.x;
      this.Position.store.y[card.entity] = drawPosition.y;
      this.Position.store.z[card.entity] = drawPosition.z + (this.deckCards.length - i + 1);
    }
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

  dragEntity:number = -1;
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
              this.discardCards.unshift(card);

              card.faceUp = true;
              this.Sprite.store.textureId[eid] = card.faceImage;

              this.Position.store.x[eid] = this.Position.store.x[this.discardEntity.id];
              this.Position.store.y[eid] = this.Position.store.y[this.discardEntity.id];
              this.Position.store.z[eid] = this.Position.store.z[this.discardEntity.id] + this.discardCards.length;
            }
            // Any face up card is going to be dragged
            else if ( card.faceUp ) {
              if ( card.stack >= 0 ) {
                // XXX: Card can only be dragged if it's part of a run
                this.dragEntity = eid;
              }
              else if ( card.foundation >= 0 ) {
                // Cards on foundations can be pulled back into the
                // tableau
                this.dragEntity = eid;
              }
              else {
                // Card must be on the discard stack
                this.dragEntity = eid;
              }
            }
          }
        }
      }
      else if ( p.button & 1 && this.dragEntity >= 0 ) {
        // Move the card being dragged
        pointer.unproject( this.camera );
        this.Position.store.x[this.dragEntity] = pointer.x;
        this.Position.store.y[this.dragEntity] = pointer.y;
        this.Position.store.z[this.dragEntity] = 2000;
      }
      // Otherwise, mouse up
      else if ( this.dragEntity >= 0 ) {
        // Try to drop the card where we are
        raycaster.setFromCamera( pointer, this.camera );
        const intersects = raycaster.intersectObjects( this.scene._scene.children, true );
        if ( intersects.length > 0 ) {
          const eid = intersects[0].object.userData.eid;
          const card = this.cards[eid];
          // Are we over a card?
          if ( card ) {
            if ( card.stack >= 0 ) {
              // If our new card is alternate suit and one rank lower
              // Otherwise, return to sender
            }
            else if ( card.foundation >= 0 ) {
              // If our new card is same suit and one rank higher
              // Otherwise, return to sender
            }
          }
          // Are we over an empty stack?
          // Are we over an empty foundation?
        }
        // Otherwise, return the card to where it was
        this.dragEntity = -1;
      }
    }
  }

  static get editorComponent():string {
    // Path to the .vue component, if any
    return 'systems/Klondike.vue';
  }
}
