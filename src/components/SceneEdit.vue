<script lang="ts">
import { defineComponent, shallowReactive, toRaw, markRaw } from "vue";
import { mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
import Game from '../bitwise/Game.ts';
import ScenePanel from './ScenePanel.vue';

export default defineComponent({
  components: {
    ScenePanel,
  },
  props: ['modelValue', 'name', 'edited'],
  data() {
    return shallowReactive({
      playing: false,
      paused: false,
      editScene: null,
      playScene: null,
    });
  },

  mounted() {
    const game = this.editGame = this.createEditorGame( 'edit-canvas' );

    // XXX: Pinch controls for zoom

    const scene = markRaw(game.addScene());

    if ( this.modelValue && Object.keys( this.modelValue ).length > 0 ) {
      scene.thaw( toRaw( this.modelValue ) );
    }
    else {
      // Create a new, blank scene
      scene.addComponent( 'Position' );
      scene.addComponent( 'Sprite' );
      scene.addComponent( 'OrthographicCamera' );
      scene.addComponent( 'RigidBody' );
      scene.addComponent( 'BoxCollider' );
      scene.addSystem( 'Physics' );
      scene.addSystem( 'Sprite' );
      scene.addSystem( 'Render' );

      // XXX: Default camera should come from game settings
      const camera = scene.addEntity();
      camera.name = "Camera";
      camera.type = "Camera";
      camera.addComponent( "Position", { sx: 1, sy: 1, sz: 1, pid: 2**32-1 } );
      camera.addComponent( "OrthographicCamera", { frustum: 10, far: 10, near: 0, zoom: 1 } );

      this.update();
    }

    this.$nextTick( () => {
      this.editGame.start();
      scene.update(0);
      scene.render();
      this.editScene = scene;
    } );
  },

  unmounted() {
    if ( this.playing ) {
      this.stop();
    }
    this.editGame.stop();
  },

  computed: {
    ...mapState( useAppStore, ['gameClass', 'isBuilding', 'systems', 'components'] ),
    scene() {
      return this.playing ? this.playScene : this.editScene;
    },
  },

  watch: {
    isBuilding(isBuilding) {
      if ( isBuilding ) {
        if ( this.playing ) {
          this.playState = this.playScene.freeze();
        }
      }
      else {
        // Update the editor game
        this.editGame.stop();
        const game = this.editGame = this.createEditorGame( 'edit-canvas' );
        const scene = markRaw(game.addScene());
        scene.thaw( toRaw( this.modelValue ) );
        this.$nextTick( () => {
          this.editGame.start();
          scene.update(0);
          scene.render();
          this.editScene = scene;
        } );

        // Start the current pane again
        if ( this.playing ) {
          this.play( this.playState );
        }
      }
    },
  },

  methods: {
    ...mapActions( useAppStore, ['getFileUrl'] ),

    // The player game is sized according to the game settings and uses
    // the runtime systems
    createPlayerGame( canvas:string, opt:Object ):Game {
      const game = new this.gameClass({
        canvas: this.$refs[canvas],
        loader: {
          base: this.getFileUrl(""),
        },
        // XXX: Get from game settings
        renderer: {
          width: 1280,
          height: 720,
        },
        ...opt,
      });

      for ( const name in this.components ) {
        console.log( `Registering player game component ${name}` );
        game.registerComponent( name, this.components[name] );
      }
      for ( const name in this.systems ) {
        // XXX: Systems should have a class method that returns the
        // editor version of the system. Using naming conventions is
        // bad and I should feel bad.
        if ( name.match(/^Editor/) ) {
          continue;
        }
        console.log( `Registering player game system ${name}` );
        game.registerSystem( name, this.systems[name] );
      }

      return markRaw(game);
    },

    // The editor game is sized to fit the screen and uses some custom
    // editor systems.
    createEditorGame( canvas:string, opt:Object ):Game {
      const game = new this.gameClass({
        canvas: this.$refs[canvas],
        loader: {
          base: this.getFileUrl(""),
        },
        data: {
          // XXX: Get from game settings
          gameWidth: 1280,
          gameHeight: 720,
        },
        ...opt,
      });

      for ( const name in this.components ) {
        console.log( `Registering editor game component ${name}` );
        game.registerComponent( name, this.components[name] );
      }
      for ( const name in this.systems ) {
        if ( name.match(/^Editor/) ) {
          continue;
        }
        console.log( `Registering editor game system ${name}` );
        let system = this.systems[ "Editor" + name ] || this.systems[name];
        game.registerSystem( name, system );
      }

      return markRaw(game);
    },

    update() {
      // update() always works with the edit scene
      // XXX: Editor scene should freeze camera settings
      const sceneData = this.editScene.freeze();
      console.log( 'Frozen', sceneData );
      this.$emit('update:name', this.name);
      this.$emit('update:modelValue', {
        ...sceneData,
        name: this.name,
      });
    },

    save() {
      this.$emit('save');
    },

    play(playState) {
      this.playState = playState ||= this.editScene.freeze();

      if ( this.playGame ) {
        this.stop()
      }

      this.playGame = this.createPlayerGame( 'play-canvas' );
      const scene = this.playScene = markRaw(this.playGame.addScene());
      scene.thaw( playState );

      this.playing = true;
      this.paused = false;
      this.$nextTick( () => {
        this.playGame.start();
        this.playScene.start();
        this.$refs['play-canvas'].focus();
      } );
    },

    pause() {
      this.playScene.pause();
      this.paused = true;
    },

    stop() {
      this.playScene.stop();
      this.playGame.stop();

      this.playScene = null;
      this.playGame = null;

      this.playing = false;
      this.paused = false;
    },
  },
});
</script>

<template>
  <div class="scene-edit">
    <div class="tab-toolbar">
      <div class="btn-toolbar" role="toolbar" aria-label="Scene editor toolbar">
        <button type="button" class="btn btn-outline-dark btn-sm me-1"
          :disabled="!edited" @click="save"
        >
          <i class="fa fa-save"></i>
        </button>
        <div class="btn-group" role="group" aria-label="Play/pause">
          <button type="button" class="btn btn-sm"
            :class="!playing ? 'btn-danger' : 'btn-outline-danger'"
            :disabled="!playing" @click="stop"
          >
            <i class="fa fa-stop"></i>
          </button>
          <button type="button" class="btn btn-sm"
            :class="playing && !paused ? 'btn-success' : 'btn-outline-success'"
            :disabled="playing && !paused" @click="play()"
          >
            <i class="fa fa-play"></i>
          </button>
          <button type="button" class="btn btn-sm"
            :class="playing && paused ? 'btn-warning' : 'btn-outline-warning'"
            :disabled="!playing || ( playing && paused )" @click="pause"
          >
            <i class="fa fa-pause"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="tab-main-edit">
      <div v-if="isBuilding" class="build-overlay"><i class="fa fa-cog fa-spin fa-10x"></i></div>
      <canvas ref="edit-canvas" v-show="playing == false" />
    </div>
    <div class="tab-main-play">
      <div v-if="isBuilding" class="build-overlay"><i class="fa fa-cog fa-spin fa-10x"></i></div>
      <canvas ref="play-canvas" v-show="playing == true" />
    </div>
    <div class="tab-sidebar">
      <ScenePanel :scene="scene" />
    </div>
  </div>
</template>

<style>
  .scene-edit {
    display: grid;
    place-content: stretch;
    grid-template-rows: 42px 1fr;
    grid-template-columns: 1fr minmax(0, auto);
    grid-template-areas: "toolbar toolbar" "main sidebar";
    height: 100%;
    overflow: hidden;
  }
  .tab-toolbar {
    grid-area: toolbar;
    padding: 2px;
    background: var(--bs-gray-100);
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .1);
  }
  .tab-sidebar {
    display: flex;
    flex-flow: column;
    font-size: 0.9em;
    grid-area: sidebar;
    padding: 2px;
    width: 200px;
    background: var(--bs-light);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%);
    overflow: hidden;
  }
  .tab-main-edit {
    position: relative;
    grid-area: main;
    align-self: stretch;
    justify-self: stretch;
    height: 100%;
    overflow: hidden;
  }
  .tab-main-play {
    position: relative;
    grid-area: main;
    align-self: center;
    justify-self: center;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .build-overlay {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background: rgba( 255, 255, 255, 0.5 );
    display: flex;
    align-items: center;
    text-align: center;
  }
  .build-overlay > * {
    flex: 1 1 100%;
    color: var(--bs-light);
  }
</style>
