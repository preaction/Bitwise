<script lang="ts">
import { defineComponent, shallowReactive, toRaw, markRaw } from "vue";
import { mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.js";
import { Game, Scene } from '@fourstar/bitwise';
import ScenePanel from './ScenePanel.vue';

/**
 * SceneEdit is the scene editor tab. The scene JSON file contains the
 * systems config and entities (with entity component configs). This
 * data is used to build two Bitwise scenes: One for editing and one for
 * playing.
 *
 * The editing scene loads only the entity data. This scene uses special
 * systems to enable editing behaviors and report information back to the
 * SceneEdit tab. In essense, it's a game that edits the game. Changes
 * made to the editing scene are copied back to the scene JSON file data.
 *
 * The playing scene loads all the data, including systems. It also adds
 * an additional system for reporting information back to the SceneEdit
 * tab. Changes made to the playing scene are displayed in the editor
 * but not copied back to the scene JSON file data.
 *
 * Much of the work of displaying scene data and editing scene data is
 * handled by the ScenePanel component used by this tab and other tabs.
 */
export default defineComponent({
  components: {
    ScenePanel,
  },
  props: ['modelValue', 'name', 'edited'],
  data() {
    return {
      sceneData: JSON.parse( JSON.stringify( this.modelValue ) ),
      playing: false,
      paused: false,
      editScene: null,
      playScene: null,
    };
  },

  mounted() {
    const game = this.editGame = this.createEditorGame( 'edit-canvas' );

    let sceneData = toRaw( this.sceneData );
    if ( !sceneData || Object.keys( sceneData ).length === 0 ) {
      // Create a new, blank scene
      // XXX: This data should come from game settings
      sceneData = this.sceneData = {
        components: [
          'Transform', 'Sprite', 'OrthographicCamera', 'RigidBody',
          'BoxCollider', 'UI',
        ],
        systems: [
          { name: 'Input', data: {} },
          { name: 'Physics', data: {} },
          { name: 'Render', data: {} },
        ],
        entities: [
          {
            name: "Camera",
            type: "Camera",
            Transform: {
              z: 2000,
              rw: 1,
              sx: 1,
              sy: 1,
              sz: 1,
              path: "Camera",
            },
            OrthographicCamera: {
              frustum: 10,
              zoom: 1,
              near: 0,
              far: 2000,
            },
          },
        ],
      };

      this.update();
    }

    const scene = this.editScene = markRaw(game.addScene());
    this.thawEditScene(sceneData);

    const editor = this.editScene.getSystem( this.systems.EditorRender );
    editor.addEventListener( 'update', () => this.update() );

    this.$nextTick( async () => {
      this.editGame.start();
      try {
        await scene.init();
        scene.start();
        scene.update(0);
      }
      catch (err) {
        console.log( `Error calling update(): `, err );
      }
      scene.render();
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
        const scene = this.editScene = markRaw(game.addScene());
        this.thawEditScene( this.sceneData );
        this.$nextTick( async () => {
          this.editGame.start();
          try {
            await scene.init();
            scene.start();
            scene.update(0);
          }
          catch (err) {
            console.log( `Error calling update(): `, err );
          }
          scene.render();
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

    thawEditScene( sceneData:any ) {
      try {
        // Editor scene gets its own systems
        const systems = [
          { name: 'Input', data: {} },
          { name: 'EditorRender', data: {} },
        ];
        if ( sceneData.systems.find( sys => sys.name === 'Physics' ) ) {
          systems.push( { name: 'EditorPhysics', data: {} } );
        }
        this.editScene.thaw({
          ...sceneData,
          systems,
        });
      }
      catch (e) {
        console.log( `Error thawing scene: ${e}` );
      }
    },

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
        game.registerComponent( name, this.components[name] );
      }
      for ( const name in this.systems ) {
        // XXX: Systems should have a class method that returns the
        // editor version of the system. Using naming conventions is
        // bad and I should feel bad.
        if ( name.match(/^Editor/) ) {
          continue;
        }
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
        game.registerComponent( name, this.components[name] );
      }
      for ( const name in this.systems ) {
        if ( !name.match(/^Editor/) ) {
          continue;
        }
        let system = this.systems[ name ];
        game.registerSystem( name, system );
      }

      return markRaw(game);
    },

    sceneChanged() {
      try {
        this.scene.update(0);
      }
      catch (err) {
        console.log( `Error calling update(): `, err );
      }
      this.scene.render();
      if ( !this.playing ) {
        this.update();
      }
    },

    update() {
      // update() always works with the edit scene
      const sceneData = this.sceneData;
      if ( this.name !== sceneData.name ) {
        this.$emit('update:name', sceneData.name);
      }
      this.$emit('update:modelValue', {
        ...toRaw(sceneData),
        name: this.name,
      });
      this.$refs.scenePanel.refresh();
    },

    save() {
      this.$emit('save');
    },

    play(playState) {
      this.playState = playState ||= this.sceneData;

      if ( this.playGame ) {
        this.stop()
      }

      this.playGame = this.createPlayerGame( 'play-canvas' );
      const scene = this.playScene = markRaw(this.playGame.addScene());
      scene.thaw( playState );

      this.playing = true;
      this.paused = false;
      this.$nextTick( async () => {
        this.playGame.start();
        // XXX: Show a rudimentary loading screen during init
        await this.playScene.init();
        this.playScene.start();
        this.$refs['play-canvas'].focus();
        // Get any entities created by scene start
        this.$refs.scenePanel.refresh();
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

    ondelete( event:KeyboardEvent, update:boolean=true ) {
      if ( !this.editScene || event.target !== this.$refs['edit-canvas'] ) {
        return;
      }
      event.preventDefault();
      const scene = this.editScene;
      const editor = scene.getSystem( this.systems.EditorRender );
      const eids:number[] = editor.getSelectedEntityIds();
      eids.forEach( eid => scene.removeEntity(eid) );
      editor.clearSelected();
      if ( update ) {
        try {
          scene.update(0);
        }
        catch (err) {
          console.log( `Error calling update(): `, err );
        }
        scene.render();
        this.update();
      }
    },

    oncut( event:KeyboardEvent ) {
      if ( !this.editScene || event.target !== this.$refs['edit-canvas'] ) {
        return;
      }
      event.preventDefault();
      this.oncopy();
      this.ondelete(event);
    },

    oncopy( event:KeyboardEvent ) {
      if ( !this.editScene || event.target !== this.$refs['edit-canvas'] ) {
        return;
      }
      event.preventDefault();
      const scene = this.editScene;
      const editor = scene.getSystem( this.systems.EditorRender );
      const eids:number[] = editor.getSelectedEntityIds();
      const frozenEntities = eids.map( eid => scene.entities[eid].freeze() );
      // Clear the path so they are put at the root
      frozenEntities.forEach( e => delete e.path );
      const blob = new Blob(
        [JSON.stringify({ type: 'bitwise/entity', items: frozenEntities }, null, 2)],
        {
          type: "text/plain",
        },
      );
      navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
    },

    async onpaste( event:KeyboardEvent ) {
      if ( !this.editScene || event.target !== this.$refs['edit-canvas'] ) {
        return;
      }
      event.preventDefault();
      const scene = this.editScene;

      const clipboardItems = await navigator.clipboard.read();
      let frozenEntities = [];
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          const blob = await clipboardItem.getType(type);
          const clipItem = JSON.parse( await blob.text() );
          frozenEntities = clipItem.items;
        }
      }

      // If entities are selected, we are replacing them. Delete
      // them first.
      this.ondelete(event, false);
      for ( const eData of frozenEntities ) {
        while ( scene.getEntityByPath( eData.name ) ) {
          const endNum = eData.name.match( /(\d+)$/ )?.[0];
          const suffix = endNum >= 0 ? parseInt(endNum) + 1 : " 1";
          const namePrefix = eData.name.replace( /\d+$/, "" );
          eData.name = namePrefix + suffix;
        }
        const entity = scene.addEntity();
        entity.thaw(eData);
      }
      try {
        scene.update(0);
      }
      catch (err) {
        console.log( `Error calling update(): `, err );
      }
      scene.render();
      this.update();
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
    <div class="tab-main-edit" v-show="playing == false">
      <div v-if="isBuilding" class="build-overlay"><i class="fa fa-cog fa-spin fa-10x"></i></div>
      <canvas ref="edit-canvas"/>
    </div>
    <div class="tab-main-play" v-show="playing == true">
      <div v-if="isBuilding" class="build-overlay"><i class="fa fa-cog fa-spin fa-10x"></i></div>
      <canvas ref="play-canvas"/>
    </div>
    <div class="tab-sidebar">
      <ScenePanel class="tab-sidebar-item" ref="scenePanel" @update="sceneChanged"
        v-model="sceneData" :scene="scene" />
    </div>
  </div>
</template>

<style>
  .scene-edit {
    display: grid;
    place-content: stretch;
    grid-template-rows: auto 1fr;
    grid-template-columns: 1fr minmax(0, auto);
    grid-template-areas: "toolbar toolbar" "main sidebar";
    height: 100%;
    overflow: hidden;
  }
  .tab-toolbar {
    grid-area: toolbar;
    color: var(--bw-color);
    background: var(--bw-border-color);
    border: 2px outset var(--bw-color);
    border-radius: 4px;
    padding: 0.1em;
  }

  .tab-sidebar {
    /* XXX: Allow changing sidebar width */
    --tab-sidebar-width: auto;
    grid-area: sidebar;
    width: 17vw;
    max-width: 17vw;
    transition: width 0.2s;
    display: flex;
    flex-flow: column;
    background: var(--bw-border-color);
    padding: 0.3em;
    height: 100%;
    overflow: hidden;
  }

  .tab-sidebar-item {
    background: var(--bw-background-color);
    color: var(--bw-color);
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
    z-index: 2;
  }
  .build-overlay > * {
    flex: 1 1 100%;
    color: var(--bs-light);
  }
</style>
