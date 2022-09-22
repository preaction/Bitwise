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
  props: ['modelValue', 'edited'],
  data() {
    return {
      sceneTree: {
        name: this.modelValue.name || 'New Scene',
        children: [],
      },
      selectedEntity: null,
      selectedComponents: {},
      componentForms: markRaw({}),
    };
  },

  async mounted() {
    this.game = new bitwise.Game({
      canvas: this.$refs['canvas'],
      loader: {
        base: this.getFileUrl(""),
      },
    });

    // XXX: Scroll controls for zoom
    // XXX: Pinch controls for zoom

    const scene = this.scene = new bitwise.Scene( this.game );
    scene.addComponent( "Parent", ParentComponent );
    scene.addComponent( "Position", PositionComponent );
    this.componentForms[ "Position" ] = PositionEdit;
    scene.addComponent( "OrthographicCamera", OrthographicCameraComponent );
    this.componentForms[ "OrthographicCamera" ] = OrthographicCameraEdit;
    scene.addComponent( "Sprite", SpriteComponent );
    this.componentForms[ "Sprite" ] = SpriteEdit;

    scene.addSystem( "Sprite", SpriteSystem );
    scene.addSystem( "Render", RenderSystem );

    if ( this.modelValue && Object.keys( this.modelValue ).length > 0 ) {
      scene.thaw( toRaw( this.modelValue ) );
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
      await this.game.loadTexture( path );
      const sprite = scene.addEntity();
      sprite.name = "Sprite";
      sprite.type = "Sprite";
      sprite.addComponent( "Parent", { id: camera.id } );
      sprite.addComponent( "Position", { x: 1, y: 0, z: 0 } );
      sprite.addComponent( "Sprite", { textureId: this.game.textures[path] } );
      console.log( `Sprite ID: ${sprite.id}` );

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



    // Load tileset
    const tileset = new Tileset({
      src: this.game.loader.base + "Tilesets/TS_Dirt.png",
      tileWidth: 16,
    });
    await tileset.load();

    // Add tilemap
    const tilemap = new Tilemap();
    tilemap.addTileset( "dirt", tileset );
    tilemap.setTile( new three.Vector2(0, 0), "dirt", 3 );
    scene._scene.add( tilemap );







    this.game.scenes.push( scene );
    this.game.start();
    scene.start();
  },

  unmounted() {
    this.game?.stop();
  },

  methods: {
    ...mapActions( useAppStore, ['getFileUrl'] ),
    update() {
      const sceneData = this.scene.freeze();
      console.log( 'Frozen', sceneData );
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
      }
      else {
        this.selectedEntity = this.scene.entities[item.entity];
        this.selectedComponents = {};
        for ( const c of this.selectedEntity.listComponents() ) {
          this.selectedComponents[c] = this.selectedEntity.getComponent(c);
        }
      }
    },

    updateComponent( name:string, data:Object ) {
      console.log( `Entity ${this.selectedEntity.id} Component ${name}`, data );
      this.selectedEntity.setComponent(name, toRaw(data));
      this.selectedComponents[name] = data;
    },
  },
});
</script>

<template>
  <div class="scene-edit">
    <div class="tab-toolbar">
      <div class="btn-toolbar" role="toolbar" aria-label="Scene editor toolbar">
        <div class="btn-group" role="group" aria-label="File actions">
          <button type="button" class="btn btn-outline-dark"
            :disabled="!edited" @click="save"
          >
            <i class="fa fa-save"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="tab-main">
      <canvas ref="canvas" />
    </div>
    <div class="tab-sidebar">
      <div>
        <ObjectTreeItem dragtype="entity" :item="sceneTree" :expand="true" :onclickitem="select" />
      </div>
      <div v-if="selectedEntity">
        <div>{{ selectedEntity.type || "Unknown Type" }}</div>
        <label>Name:
          <input v-model="selectedEntity.name" pattern="^[^/]+$" />
        </label>
        <div v-for="c in selectedEntity.listComponents()">
          <component :is="componentForms[c]" v-model="selectedComponents[c]" :scene="scene" @update="updateComponent(c, $event)" />
        </div>
      </div>
      <div v-else>
        <div>Scene</div>
        <label>Name:
          <input v-model="sceneTree.name" pattern="^[^/]+$" />
        </label>
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
    grid-area: sidebar;
    padding: 2px;
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
</style>
