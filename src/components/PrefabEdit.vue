<script lang="ts">
import { defineComponent, toRaw, markRaw, shallowReactive } from "vue";
import { mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
import ObjectTreeItem from './ObjectTreeItem.vue';
import ScenePanel from './ScenePanel.vue';
import * as three from 'three';
import * as bitecs from 'bitecs';
import Game from '../bitwise/Game.ts';
import Scene from '../bitwise/Scene.ts';

export default defineComponent({
  components: {
    ScenePanel,
  },
  props: ['modelValue', 'name', 'edited'],
  data() {
    return shallowReactive({
      scene: null,
      game: null,
      entity: null,
    });
  },

  mounted() {
    const scene = this.createScene();
    const entity = scene.addEntity();

    if ( this.modelValue && Object.keys( this.modelValue ).length > 0 ) {
      entity.thaw( toRaw( this.modelValue ) );
    }

    this.$nextTick( () => {
      this.game.start();
      scene.update(0);
      scene.render();
      this.scene = scene;
      this.entity = entity;
    } );
  },

  computed: {
    ...mapState( useAppStore, ['gameClass', 'isBuilding', 'systems', 'components'] ),
  },

  methods: {
    ...mapActions( useAppStore, ['getFileUrl'] ),

    createScene() {
      const game = this.game = this.createEditorGame( 'prefab-canvas' );
      const scene = markRaw( game.addScene() );

      // Create a new, blank scene
      scene.addComponent( 'Position' );
      scene.addComponent( 'Sprite' );
      scene.addComponent( 'OrthographicCamera' );
      scene.addComponent( 'RigidBody' );
      scene.addComponent( 'BoxCollider' );
      scene.addSystem( 'Physics' );
      scene.addSystem( 'Sprite' );
      // XXX: Render camera should come from game settings
      scene.addSystem( 'Render' );

      return scene;
    },

    // XXX: Duplicate from SceneEdit. Should be moved to store or library
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
      const prefabData = this.entity.freeze();
      console.log( 'Frozen', prefabData );
      this.$emit('update:name', this.name);
      this.$emit('update:modelValue', {
        ...prefabData,
        name: this.name,
      });
    },

    save() {
      this.$emit('save');
    },

  },
});
</script>

<template>
  <div class="prefab-edit">
    <div class="prefab-tab-toolbar">
      <div class="btn-toolbar" role="toolbar" aria-label="Prefab editor toolbar">
        <button type="button" class="btn btn-outline-dark btn-sm me-1"
          :disabled="!edited" @click="save"
        >
          <i class="fa fa-save"></i>
        </button>
      </div>
    </div>
    <div class="prefab-tab-main">
      <div v-if="isBuilding" class="prefab-build-overlay"><i class="fa fa-cog fa-spin fa-10x"></i></div>
      <canvas ref="prefab-canvas" />
    </div>
    <div class="prefab-tab-sidebar">
      <ScenePanel :scene="scene" :is-prefab="true" />
    </div>
  </div>
</template>

<style>
  .prefab-edit {
    display: grid;
    place-content: stretch;
    grid-template-rows: 42px 1fr;
    grid-template-columns: 1fr minmax(0, auto);
    grid-template-areas: "toolbar toolbar" "main sidebar";
    height: 100%;
    overflow: hidden;
  }
  .prefab-tab-toolbar {
    grid-area: toolbar;
    padding: 2px;
    background: var(--bs-gray-100);
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .1);
  }
  .prefab-tab-sidebar {
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
  .prefab-tab-main {
    position: relative;
    grid-area: main;
    align-self: stretch;
    justify-self: stretch;
    height: 100%;
    overflow: hidden;
  }
  .prefab-build-overlay {
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
  .prefab-build-overlay > * {
    flex: 1 1 100%;
    color: var(--bs-light);
  }
</style>
