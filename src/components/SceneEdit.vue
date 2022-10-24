<script lang="ts">
import { defineComponent, toRaw, markRaw } from "vue";
import { mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
import ObjectTreeItem from './ObjectTreeItem.vue';
import * as three from 'three';
import * as bitecs from 'bitecs';
import Game from '../bitwise/Game.ts';

export default defineComponent({
  components: {
    ObjectTreeItem,
  },
  props: ['modelValue', 'name', 'edited'],
  data() {
    return {
      sceneTree: {
        name: this.name || 'New Scene',
        icon: 'fa-film',
        children: [],
      },
      selectedSceneItem: null,
      selectedEntity: null,
      selectedComponents: {},
      sceneSystems: [],
      icons: {
        "Camera": "fa-camera",
        "Sprite": "fa-image-portrait",
      },
      playing: false,
      paused: false,
    };
  },

  mounted() {
    const game = this.editGame = this.createEditorGame( 'edit-canvas' );

    // XXX: Pinch controls for zoom

    const scene = this.editScene = game.addScene();

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
      this.editScene.update(0);
      this.editScene.render();
    } );

    this.updateSceneTree(scene);
  },

  unmounted() {
    if ( this.playing ) {
      this.stop();
    }
    this.editGame.stop();
  },

  computed: {
    ...mapState( useAppStore, ['gameClass', 'components', 'systems', 'componentForms', 'systemForms'] ),
    scene() {
      return this.playing ? this.playScene : this.editScene;
    },
    availableComponents() {
      return Object.keys( this.components );
    },
    availableSystems() {
      return Object.keys( this.systems ).filter( s => !s.match(/^Editor/) );
    },
  },

  methods: {
    ...mapActions( useAppStore, ['getFileUrl'] ),

    updateSceneTree( scene:Scene ) {
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

        const pid = scene.components.Position.store.pid[id];
        if ( pid < 2**32-1 ) {
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

      // Update the systems array
      this.sceneSystems = scene.systems.map( s => ({ name: s.name, data: s.freeze() }) );
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

      return game;
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

      return game;
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

    select(item) {
      if ( this.sceneTree === item ) {
        this.selectedEntity = null;
        this.selectedSceneItem = null;
        this.selectedComponents = {};
        return;
      }
      this.selectedSceneItem = item;
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

    updateSystem( idx:number, data:Object ) {
      this.sceneSystems[idx].data = data;
      // XXX: Add freeze/thaw for systems
      //this.scene.systems[idx].thaw( data );
      this.update();
      this.scene.update(0);
      this.scene.render();
    },
    play() {
      const playState = this.editScene.freeze();

      this.playGame = this.createPlayerGame( 'play-canvas' );
      const scene = this.playScene = this.playGame.addScene();
      scene.thaw( playState );

      this.playing = true;
      this.paused = false;
      this.$nextTick( () => {
        this.updateSceneTree(scene);
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

      this.updateSceneTree(this.editScene);
    },

    startDragSystem(event, index) {
      event.dataTransfer.setData("bitwise/system", index);
    },

    dragOverSystem(event, index) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      // XXX: Show drop indicator
    },

    dropSystem(event, index) {
      const data = event.dataTransfer.getData("bitwise/system");
      if ( data ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        console.log( `Moving system ${data} to ${index}` );
        const system = this.scene.systems.splice(data, 1);
        this.scene.systems.splice( index, 0, ...system );
        this.update();
        this.updateSceneTree( this.scene );
      }
    },

    hasSystem( name:string ) {
      return !!this.sceneSystems.find( s => s.name === name );
    },

    addSystem( name:string ) {
      if ( this.hasSystem(name) ) {
        return;
      }
      this.scene.addSystem( name );
      this.scene.update(0);
      this.scene.render();
      this.update();
      this.updateSceneTree( this.scene );
    },

    removeSystem( idx ) {
      this.scene.systems.splice( idx, 1 );
      this.scene.update(0);
      this.scene.render();
      this.update();
      this.updateSceneTree( this.scene );
    },

    updateEntityName() {
      this.selectedEntity.name = this.selectedSceneItem.name;
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
    <div class="tab-main-edit">
      <canvas ref="edit-canvas" v-show="playing == false" />
    </div>
    <div class="tab-main-play">
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
          <input class="flex-fill text-end col-1" v-model="selectedSceneItem.name"
            @keyup="updateEntityName" pattern="^[^/]+$"
          />
        </div>
        <div v-for="c in selectedEntity.listComponents()" :key="selectedEntity.id + c">
          <div class="mb-1 d-flex justify-content-between align-items-center">
            <h6 class="m-0">{{ c }}</h6>
            <i @click="removeComponent(c)" class="fa fa-close me-1 icon-button"></i>
          </div>
          <div v-if="componentForms[c]" class="my-2 component-form">
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
        <div v-for="s, idx in sceneSystems" :key="s.name" class="system-form">
          <div class="mb-1 d-flex justify-content-between align-items-center"
            draggable="true" @dragstart="startDragSystem( $event, idx )"
            @dragover="dragOverSystem( $event, idx )" @drop="dropSystem( $event, idx )"
          >
            <h6 class="m-0"><i class="fa fa-arrows-up-down system-move"></i> {{ s.name }}</h6>
            <i @click="removeSystem(idx)" class="fa fa-close me-1 icon-button"></i>
          </div>
          <div v-if="systemForms[s.name]" class="my-2">
            <component :is="systemForms[s.name]" v-model="s.data"
            @update="updateSystem(idx, $event)" />
          </div>
        </div>
        <div class="dropdown m-2 mt-4 text-center dropup">
          <button class="btn btn-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            Add System...
          </button>
          <ul class="dropdown-menu">
            <li v-for="s in availableSystems">
              <a class="dropdown-item" :class="hasSystem(s) ? 'disabled' : ''" href="#" @click="addSystem(s)">{{s}}</a>
            </li>
          </ul>
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
    grid-area: main;
    align-self: stretch;
    justify-self: stretch;
    height: 100%;
    overflow: hidden;
  }
  .tab-main-play {
    grid-area: main;
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

  .system-form .system-move {
    visibility: hidden;
  }
  .system-form:hover .system-move {
    visibility: visible;
  }
</style>
