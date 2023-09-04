<script lang="ts">
import { defineComponent, toRaw, markRaw, shallowReactive } from "vue";
import ScenePanel from './ScenePanel.vue';
import { Game } from '@fourstar/bitwise';

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

    const editor = scene.getSystem( this.systems.EditorRender );
    editor.addEventListener( 'update', () => this.update() );

    const entity = scene.addEntity();

    if ( this.modelValue && Object.keys( this.modelValue ).length > 0 ) {
      entity.thaw( toRaw( this.modelValue ) );
    }

    this.scene = scene;
    this.entity = entity;

    this.$nextTick( () => {
      this.game.start();
      scene.update(0);
      scene.render();
    } );
  },

  methods: {
    createScene() {
      const game = this.game = this.createEditorGame( 'prefab-canvas' );
      const scene = markRaw( game.addScene() );

      // Create a new, blank scene
      scene.addComponent( 'Transform' );
      scene.addComponent( 'Sprite' );
      scene.addComponent( 'OrthographicCamera' );
      scene.addComponent( 'RigidBody' );
      scene.addComponent( 'BoxCollider' );
      scene.addSystem( 'Physics' );
      // XXX: Render camera should come from game settings
      scene.addSystem( 'EditorRender' );

      return scene;
    },

    // XXX: Duplicate from SceneEdit. Should be moved to store or library
    createEditorGame( canvas:string, opt:Object={} ):Game {
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
        if ( name.match(/^Editor/) ) {
          continue;
        }
        let system = this.systems[ "Editor" + name ] || this.systems[name];
        game.registerSystem( name, system );
      }

      return markRaw(game);
    },

    sceneChanged() {
      this.scene.update(0);
      this.scene.render();
      this.update();
    },

    update() {
      const prefabData = this.entity.freeze();
      if ( this.name !== prefabData.name ) {
        this.$emit('update:name', prefabData.name);
      }
      this.$emit('update:modelValue', {
        ...prefabData,
        name: this.name,
      });
      this.$refs.scenePanel.refresh();
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
      <ScenePanel class="prefab-tab-sidebar-item" ref="scenePanel" @update="sceneChanged" :scene="scene" :is-prefab="true" />
    </div>
  </div>
</template>

<style>
  .prefab-edit {
    display: grid;
    place-content: stretch;
    grid-template-rows: auto 1fr;
    grid-template-columns: 1fr minmax(0, auto);
    grid-template-areas: "toolbar toolbar" "main sidebar";
    height: 100%;
    overflow: hidden;
  }
  .prefab-tab-toolbar {
    grid-area: toolbar;
    color: var(--bw-color);
    background: var(--bw-border-color);
    border: 2px outset var(--bw-color);
    border-radius: 4px;
    padding: 0.1em;
  }

  .prefab-tab-sidebar {
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

  .prefab-tab-sidebar-item {
    background: var(--bw-background-color);
    color: var(--bw-color);
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
    z-index: 2;
  }
  .prefab-build-overlay > * {
    flex: 1 1 100%;
    color: var(--bs-light);
  }
</style>
