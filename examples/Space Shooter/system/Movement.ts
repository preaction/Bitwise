
import * as three from 'three';
import * as bitecs from 'bitecs';
import { System } from '@fourstar/bitwise';
import { Physics, Input } from '@fourstar/bitwise/system';
import { Position } from '@fourstar/bitwise/component';
import PlayerComponent from '../component/Player.js';
import WeaponComponent from '../component/Weapon.js';

export default class Movement extends System {
  position!:Position;
  input!:Input;
  physics!:Physics;
  query!:bitecs.Query;
  playerComponent!:PlayerComponent;
  weaponComponent!:WeaponComponent;

  async init() {
    const scene = this.scene;
    this.position = scene.getComponent(Position);
    const player = this.playerComponent = scene.getComponent( PlayerComponent );
    const query = this.query = scene.game.ecs.defineQuery([ player.store ]);

    this.physics = scene.getSystem( Physics );
    this.input = scene.getSystem( Input );

    const playerEids = this.query(this.scene.world);
    for ( const eid of playerEids ) {
      const weaponId = this.playerComponent.store.weapon[ eid ];
      const weaponPath = PlayerComponent.paths[ weaponId ];
      const prefab = this.weaponPrefabs[weaponId] = await this.scene.game.load.json( weaponPath );
      // Pre-register components in our prefab
      for ( const key in prefab ) {
        if ( typeof prefab[key] === 'object' ) {
          scene.addComponent( key );
        }
      }
    }

    this.weaponComponent = scene.getComponent(WeaponComponent);
  }

  start() {
    this.physics.watchEnterByQuery( this.query, this.onCollide.bind(this) );
    this.input.watchKey( 'ArrowLeft', 'left' );
    this.input.watchKey( 'ArrowRight', 'right' );
    this.input.watchKey( 'ArrowUp', 'up' );
    this.input.watchKey( 'ArrowDown', 'down' );
    this.input.watchKey( ' ', 'fire' );
  }

  weaponPrefabs:{[key:number]: any} = {};

  stop() {
    // XXX: this.physics.unwatchEnterByQuery( this.query );
    // XXX: this.input.unwatchKey( 'ArrowLeft', 'left' );
    // XXX: this.input.unwatchKey( 'ArrowRight', 'right' );
    // XXX: this.input.unwatchKey( 'ArrowUp', 'up' );
    // XXX: this.input.unwatchKey( 'ArrowDown', 'down' );
    // XXX: this.input.unwatchKey( ' ', 'fire' );
  }

  onCollide( eid:number, hits:Set<number> ) {
    console.log( `${eid} hit ${Array.from(hits).join(', ')}` );
  }

  update( timeMilli:number ) {
    if ( !this.input || !this.physics || !this.query ) {
      return;
    }
    const key = this.input.key;
    const x = key.left ? -1 : key.right ? 1 : 0;
    const y = key.down ? -1 : key.up ? 1 : 0;
    const z = 0;
    const speed = 0.5;

    let vec = new three.Vector3(x, y, z);
    if ( vec.length() > 0 ) {
      vec.normalize();
      vec = vec.multiplyScalar( timeMilli * speed );
    }

    const playerEids = this.query(this.scene.world);
    for ( const eid of playerEids ) {
      this.physics.setVelocity( eid, vec );
      const weaponId = this.playerComponent.store.weapon[ eid ];
      if ( this.cooldown[ weaponId ] > 0 ) {
        this.cooldown[weaponId] -= timeMilli;
      }
      if ( ( !this.cooldown[weaponId] || this.cooldown[ weaponId ] <= 0 ) && key.fire ) {
        const weapon = this.scene.addEntity( this.weaponPrefabs[weaponId] );
        this.position.store.x[ weapon.id ] += this.position.store.x[eid];
        this.position.store.y[ weapon.id ] += this.position.store.y[eid];
        this.position.store.z[ weapon.id ] += this.position.store.z[eid];
        this.cooldown[ weaponId ] = this.weaponComponent.store.cooldown[weapon.id];
      }
    }
  }

  cooldown:{ [key:number]: number } = {};
}
