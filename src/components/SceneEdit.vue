<script lang="ts">
import { defineComponent, toRaw, markRaw } from "vue";
import { mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
import ObjectTreeItem from './ObjectTreeItem.vue';
import * as three from 'three';
import * as bitecs from 'bitecs';
import * as bitwise from '../Bitwise.ts';

import PositionEdit from './bitwise/Position.vue';
import OrthographicCameraEdit from './bitwise/OrthographicCamera.vue';
import SpriteEdit from './bitwise/Sprite.vue';

// XXX: In the future, scene entities like this will need to be loaded by
// the code, on demand.
import Tileset from './../bitwise/Tileset.ts';
import { Tilemap, Tile } from './../bitwise/Tilemap.ts';
import ParentComponent from '../bitwise/component/Parent.ts';
import PositionComponent from '../bitwise/component/Position.ts';
import OrthographicCameraComponent from '../bitwise/component/OrthographicCamera.ts';
import SpriteComponent from '../bitwise/component/Sprite.ts';
import SpriteSystem from '../bitwise/system/Sprite.ts';
import RenderSystem from '../bitwise/system/Render.ts';

export default defineComponent({
  components: {
    ObjectTreeItem,

    PositionEdit,
    OrthographicCameraEdit,
    SpriteEdit,
  },
  props: ['modelValue', 'name', 'edited'],
  data() {
    return {
      sceneTree: {
        name: this.name || 'New Scene',
        icon: 'fa-film',
        children: [],
      },
      selectedEntity: null,
      selectedComponents: {},
      componentForms: markRaw({}),
      icons: {
        "Camera": "fa-camera",
        "Sprite": "fa-image-portrait",
      },
      playing: false,
      paused: false,
    };
  },

  async mounted() {
    const game = this.editGame = this.createGame( 'edit-canvas' );

    this.componentForms[ "Position" ] = PositionEdit;
    this.componentForms[ "OrthographicCamera" ] = OrthographicCameraEdit;
    this.componentForms[ "Sprite" ] = SpriteEdit;

    // XXX: Scroll controls for zoom
    // XXX: Pinch controls for zoom

    const scene = this.editScene = game.addScene();

    if ( this.modelValue && Object.keys( this.modelValue ).length > 0 ) {
      scene.thaw( toRaw( this.modelValue ) );
      // XXX: Systems should be recorded in frozen scene data
      scene.addSystem( 'Render' );
      scene.addSystem( 'Sprite' );
    }
    else {
      // Create a new, blank scene
      const camera = scene.addEntity();
      camera.name = "Camera";
      camera.type = "Camera";
      camera.addComponent( "Position" );
      camera.addComponent( "OrthographicCamera", { frustum: 0.2, far: 5, near: 0, zoom: 1 } );
      console.log( `Camera ID: ${camera.id}` );

      // Random thingy
      const path = "Other/Misc/Tree/Tree.png";
      await game.loadTexture( path );
      const sprite = scene.addEntity();
      sprite.name = "Sprite";
      sprite.type = "Sprite";
      sprite.addComponent( "Parent", { id: camera.id } );
      sprite.addComponent( "Position", { x: 1, y: 0, z: 0 } );
      sprite.addComponent( "Sprite", { textureId: game.textures[path] } );
      console.log( `Sprite ID: ${sprite.id}` );

      scene.addSystem( 'Render' );
      scene.addSystem( 'Sprite' );

      this.update();
    }

    // Find all the entities and build tree items for them
    const tree = {};
    for ( const id of scene.eids ) {
      const entity = scene.entities[id];
      console.log( `Treeing entity ${id}` );
      if ( !tree[id] ) {
        tree[id] = { entity: null, children: [] };
      }
      tree[id].entity = id;
      tree[id].name = entity.name;
      tree[id].icon = this.icons[ entity.type ];

      console.log( entity.listComponents() );
      if ( entity.listComponents().includes("Parent") ) {
        const pid = scene.components.Parent.store.id[id];
        console.log( `Parenting to ${pid}` );
        if ( !tree[pid] ) {
          tree[pid] = { entity: null, children: [] };
        }
        tree[pid].children.push( tree[id] );
        delete tree[id];
      }
    }
    console.log( "Completed tree:", tree );
    this.sceneTree.children = Object.values(tree);

    this.editGame.start();
  },

  unmounted() {
    if ( this.playing ) {
      this.stop();
    }
  },

  computed: {
    scene() {
      return this.playing ? this.playScene : this.editScene;
    },
    availableComponents() {
      return [ "Position", "OrthographicCamera", "Sprite" ];
    },
  },

  methods: {
    ...mapActions( useAppStore, ['getFileUrl'] ),

    createGame( canvas:string ):bitwise.Game {
      const game = new bitwise.Game({
        canvas: this.$refs[canvas],
        loader: {
          base: this.getFileUrl(""),
        },
      });

      game.registerComponent( "Parent", ParentComponent );
      game.registerComponent( "Position", PositionComponent );
      game.registerComponent( "OrthographicCamera", OrthographicCameraComponent );
      game.registerComponent( "Sprite", SpriteComponent );
      game.registerSystem( "Sprite", SpriteSystem );
      game.registerSystem( "Render", RenderSystem );

      return game;
    },

    update() {
      // update() always works with the edit scene
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

    select(item) {
      if ( this.sceneTree === item ) {
        this.selectedEntity = null;
        this.selectedComponents = {};
        return;
      }
      this.selectEntity( this.scene.entities[item.entity] );
    },

    selectEntity(entity) {
      this.selectedEntity = entity;
      // XXX: selectedComponents could be a computed property
      this.selectedComponents = {};
      for ( const c of this.selectedEntity.listComponents() ) {
        this.selectedComponents[c] = this.selectedEntity.getComponent(c);
      }
    },

    updateComponent( name:string, data:Object ) {
      console.log( `Entity ${this.selectedEntity.id} Component ${name}`, data );
      this.selectedEntity.setComponent(name, toRaw(data));
      this.selectedComponents[name] = data;
      this.update();
      this.scene.update(0);
      this.scene.render();
    },

    removeComponent( name:string ) {
      if ( confirm( 'Are you sure?' ) ) {
        this.selectedEntity.removeComponent(name);
        this.scene.update(0);
        this.scene.render();
        this.update();
      }
    },

    hasComponent( name:string ) {
      return this.selectedEntity.listComponents().includes(name);
    },

    addComponent( name:string ) {
      if ( this.hasComponent(name) ) {
        return;
      }
      this.selectedEntity.addComponent(name);
      this.scene.update(0);
      this.scene.render();
      this.update();
    },

    addEntity( ...components:string[] ) {
      const entity = this.editScene.addEntity();
      this.sceneTree.children.push( { name: entity.name, entity: entity.id, children: [] } );
      for ( const c of components ) {
        entity.addComponent(c);
      }
      this.selectEntity( entity );
      this.update();
    },

    updateName( event ) {
      const name = event.target.value;
      this.sceneTree.name = name;
      this.modelValue.name = name;
      this.$emit( 'update:name', name );
    },

    deleteEntity( item ) {
      if ( confirm( `Are you sure you want to delete "${item.name}"?` ) ) {
        const scene = this.scene;
        const entity = scene.entities[ item.entity ];
        if ( this.selectedEntity?.id === entity.id ) {
          this.select( this.sceneTree );
        }
        scene.removeEntity( entity.id );
        scene.update(0);
        scene.render();
        this.$refs.tree.removeItem(item);
        this.update();
      }
    },

    play() {
      const playState = this.editScene.freeze();

      this.playGame = this.createGame( 'play-canvas' );
      const scene = this.playScene = this.playGame.addScene();
      scene.thaw( playState );
      // XXX: Systems should be recorded in frozen scene data
      scene.addSystem( 'Render' );
      scene.addSystem( 'Sprite' );

      this.playing = true;
      this.paused = false;
      this.$nextTick( () => {
        this.playGame.start();
        this.playScene.start();
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
            :disabled="playing && !paused" @click="play"
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
    <div class="tab-main">
      <canvas ref="edit-canvas" v-show="playing == false" />
      <canvas ref="play-canvas" v-show="playing == true" />
    </div>
    <div class="tab-sidebar">
      <div class="scene-toolbar">
        <div class="dropdown">
          <button class="btn btn-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="fa fa-file-circle-plus"></i>
            New Entity
          </button>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" @click="addEntity()">Blank</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="#" @click="addEntity('Position','Sprite')">Sprite</a></li>
            <li><a class="dropdown-item" href="#" @click="addEntity('Position','OrthographicCamera')">Orthographic Camera</a></li>
          </ul>
        </div>
      </div>
      <div class="scene-tree">
        <ObjectTreeItem ref="tree" dragtype="entity" :item="sceneTree" :expand="true" :onclickitem="select">
          <template #menu="{item}">
            <i class="delete fa fa-circle-xmark align-self-center" @click.prevent.stop="deleteEntity(item)"></i>
          </template>
        </ObjectTreeItem>
      </div>
      <div class="entity-pane" v-if="selectedEntity">
        <h5>{{ selectedEntity.type || "Unknown Type" }}</h5>
        <div class="d-flex justify-content-between align-items-center">
          <label class="me-1">Name</label>
          <input class="flex-fill text-end col-1" v-model="selectedEntity.name" pattern="^[^/]+$" />
        </div>
        <div v-for="c in selectedEntity.listComponents()" :key="selectedEntity.id + c">
          <div v-if="componentForms[c]" class="my-2 component-form">
            <div class="mb-1 d-flex justify-content-between align-items-center">
              <h6 class="m-0">{{ c }}</h6>
              <i @click="removeComponent(c)" class="fa fa-close me-1 icon-button"></i>
            </div>
            <component :is="componentForms[c]" v-model="selectedComponents[c]"
              :scene="scene" @update="updateComponent(c, $event)"
            />
          </div>
        </div>
        <div class="dropdown m-2 mt-4 text-center dropup">
          <button class="btn btn-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            Add Component...
          </button>
          <ul class="dropdown-menu">
            <li v-for="c in availableComponents">
              <a class="dropdown-item" :class="hasComponent(c) ? 'disabled' : ''" href="#" @click="addComponent(c)">{{c}}</a>
            </li>
          </ul>
        </div>
      </div>
      <div v-else class="entity-pane">
        <h5>Scene</h5>
        <div class="d-flex justify-content-between align-items-center">
          <label class="me-1">Name</label>
          <input v-model="sceneTree.name" @input="updateName" class="flex-fill text-end col-1" pattern="^[^/]+$" />
        </div>
      </div>
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
  .tab-main {
    grid-area: main;
    padding: 2px;
    align-self: center;
    justify-self: center;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .scene-toolbar {
    flex: 0 0 auto;
  }
  .scene-tree {
    border-bottom: 1px solid rgb(0 0 0 / 10%);
    margin-bottom: 2px;
    overflow: scroll;
    flex: 1 1 25%;
  }
  .entity-pane {
    flex: 1 1 75%;
    padding: 2px;
    overflow: scroll;
  }
  .component-form {
    padding-top: 2px;
    border-top: 1px solid rgb(0 0 0 / 10%);
    margin-top: 2px;
  }
  .icon-button {
    cursor: pointer;
  }

  .object-tree-item .name i.delete {
    visibility: hidden;
  }
  .object-tree-item .name:hover i.delete {
    visibility: visible;
  }
</style>
