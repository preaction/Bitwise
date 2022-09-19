<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
import ObjectTreeItem from './ObjectTreeItem.vue';
import * as three from 'three';
import * as bitecs from 'bitecs';
import * as bitwise from '../Bitwise.ts';

import Position from './bitwise/Position.vue';
import OrthographicCamera from './bitwise/OrthographicCamera.vue';

// XXX: In the future, scene entities like this will need to be loaded by
// the code, on demand.
import Tileset from './../bitwise/Tileset.ts';
import { Tilemap, Tile } from './../bitwise/Tilemap.ts';

export default defineComponent({
  components: {
    ObjectTreeItem,

    Position,
    OrthographicCamera,
  },
  props: ['modelValue', 'edited'],
  data() {
    return {
      type: 'Scene',
      name: 'New Scene',
      entities: null,
      treeItems: [
      ],
      selectedEntity: null,
      ...this.modelValue,
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
    if ( this.entities ) {
      scene.deserialize( this.entities );
    }
    else {
      // Create a new, blank scene
      const camera = scene.addEntity();
      camera.addComponent( "Position" );
      camera.addComponent( "OrthographicCamera", { frustum: 2 } );

      // Random thingy
      const thing = camera.addEntity();
      thing.addComponent( "Position", { x: 1, y: 1, z: 1 } );

      this.update();
    }

    // Find all the entities and build tree items for them
    const tree = {};
    for ( const id of scene.listEntities() ) {
      const hasParent = bitecs.hasComponent( scene.world, scene.components.Parent, id );
      if ( hasParent ) {
        const pid = scene.components.Parent.id[id];
        console.log( `ID: ${id}; PID: ${pid}` );
      }
      else {
        console.log( `ID: ${id}; PID: -1` );
      }
    }



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
      this.$emit('update:modelValue', {
        name: this.name,
        entities: this.scene.serialize(),
      });
    },
    save() {
      this.$emit('save');
    },
    select(item) {
      if ( item.type === "Scene" && item.path === "/" ) {
        this.selectedEntity = null;
      }
      else {
        this.selectedEntity = item;
      }
    },

    updateComponent( type:string, data:Object ) {
      // XXX: Update data in current entity in scene
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
        <ObjectTreeItem :dragtype="entity" :item="$data" :expand="true" :onclickitem="select" />
      </div>
      <div v-if="selectedEntity">
        <div>{{ selectedEntity.type }}</div>
        <label>Name:
          <input v-model="selectedEntity.name" />
        </label>
        <div v-for="c in selectedEntity.components">
          <component :is="c.type" v-model="c.data" @update="updateComponent( c.type, c.data )" />
        </div>
      </div>
      <div v-else>
        <div>Scene</div>
        <label>Name:
          <input v-model="name" />
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
