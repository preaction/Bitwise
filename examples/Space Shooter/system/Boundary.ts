
import * as three from 'three';
import * as bitecs from 'bitecs';
import { System } from '@fourstar/bitwise';
import { Physics, Render } from '@fourstar/bitwise/system';
import { Position } from '@fourstar/bitwise/component';
import PlayerComponent from '../component/Player.js';

export default class Boundary extends System {
  physics!:Physics;
  renderSystem!:Render;
  seen:Set<number> = new Set();
  boundaryPath:string = "";
  boundaryBox!:three.Box3;
  playerQuery!:bitecs.Query;
  playerComponent!:PlayerComponent;
  positionComponent!:Position;

  static editorComponent = 'editor/system/Boundary.vue';

  async init() {
    this.physics = this.scene.getSystem( Physics );
    this.renderSystem = this.scene.getSystem( Render );
    this.positionComponent = this.scene.getComponent(Position);
    const player = this.playerComponent = this.scene.getComponent( PlayerComponent );
    this.playerQuery = this.scene.game.ecs.defineQuery([ player.store ]);
  }

  start() {
    const boundary = this.scene.getEntityByPath( this.boundaryPath );
    if ( boundary ) {
      console.log( `Boundary ID: ${boundary.id}` );
      this.physics.watchEnter( boundary.id, this.onCollideEnter.bind(this) );
      this.physics.watchExit( boundary.id, this.onCollideExit.bind(this) );
      const pos = this.positionComponent.store;
      this.boundaryBox = new three.Box3().setFromCenterAndSize(
        new three.Vector3( pos.x[boundary.id], pos.y[boundary.id], pos.z[boundary.id] ),
        new three.Vector3( pos.sx[boundary.id], pos.sy[boundary.id], pos.sz[boundary.id] ),
      );

      let horizontal = 0;
      let vertical = 0;
      const playerEids = this.playerQuery(this.scene.world);
      for ( const eid of playerEids ) {
        horizontal = Math.max( horizontal, pos.sx[eid] / 2 );
        vertical = Math.max( vertical, pos.sy[eid] / 2 );
      }
      const adjust = new three.Vector3( horizontal, vertical, 0 );
      this.boundaryBox.min.add( adjust );
      this.boundaryBox.max.sub( adjust );
    }
  }

  thaw( data:any ) {
    this.boundaryPath = data.boundaryPath;
  }

  freeze():any {
    const data = super.freeze();
    data.boundaryPath = this.boundaryPath;
    return data;
  }

  onCollideEnter( eid:number, hits:Set<number> ) {
    console.log( `${eid} entered ${Array.from(hits).join(', ')}` );
  }

  onCollideExit( eid:number, hits:Set<number> ) {
    console.log( `${eid} exited ${Array.from(hits).join(', ')}` );
    for ( const leftEid of hits ) {
      this.scene.removeEntity( leftEid );
    }
  }

  update( timeMilli:number ) {
    if ( !this.positionComponent ) {
      return;
    }
    const pos = this.positionComponent.store;
    // Constrain player to boundary
    const playerEids = this.playerQuery(this.scene.world);
    for ( const eid of playerEids ) {
      const fromPoint = new three.Vector3( pos.x[eid], pos.y[eid], pos.z[eid] );
      const toPoint = new three.Vector3();
      this.boundaryBox.clampPoint(fromPoint, toPoint);
      if ( !fromPoint.equals( toPoint ) ) {
        console.log( `Clamping from ${fromPoint.x},${fromPoint.y} to ${toPoint.x},${toPoint.y} (${this.boundaryBox.min.x},${this.boundaryBox.min.y}; ${this.boundaryBox.max.x},${this.boundaryBox.max.y})` );
        pos.x[eid] = toPoint.x;
        pos.y[eid] = toPoint.y;
        pos.z[eid] = toPoint.z;
        this.physics.setPosition(eid, toPoint);
      }
    }
  }

}
