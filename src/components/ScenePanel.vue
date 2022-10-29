<script lang="ts">
import { defineComponent, toRaw, markRaw } from "vue";
import { mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
import ObjectTreeItem from './ObjectTreeItem.vue';

export default defineComponent({
  components: {
    ObjectTreeItem,
  },
  props: ['scene', 'isPrefab'],
  data() {
    return {
      sceneTree: {},
      selectedSceneItem: null,
      selectedEntity: null,
      selectedComponents: {},
      sceneSystems: [],
      icons: {
        "Camera": "fa-camera",
        "Sprite": "fa-image-portrait",
      },
    }
  },
  watch: {
    scene(newScene:Scene) {
      if ( newScene ) {
        console.log( 'Got a new scene, updating tree' );
        this.updateSceneTree(newScene);
      }
    }
  },
  mounted() {
    if ( this.scene ) {
      this.updateSceneTree( this.scene );
    }
  },
  computed: {
    ...mapState( useAppStore, ['components', 'systems', 'componentForms', 'systemForms'] ),
    availableComponents() {
      return Object.keys( this.components );
    },
    availableSystems() {
      return Object.keys( this.systems ).filter( s => !s.match(/^Editor/) );
    },
  },

  methods: {
    updateSceneTree(scene:Scene) {
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

      if ( this.isPrefab ) {
        this.sceneTree = Object.values(tree)[0];
      }
      else {
        this.sceneTree = {
          name: scene?.name || 'New Scene',
          icon: 'fa-film',
          children: Object.values(tree),
        };
      }

      // Update the systems array
      this.sceneSystems = scene.systems.map( s => ({ name: s.name, data: s.freeze() }) );
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
      const entity = this.scene.addEntity();
      for ( const c of components ) {
        entity.addComponent(c);
      }
      console.log( 'Added entity, updating tree' );
      this.updateSceneTree(this.scene);
      const entityItem = this.sceneTree.children[ this.sceneTree.children.length - 1 ];
      this.select( entityItem );
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
        console.log( 'Dropped system, updating tree' );
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
      console.log( 'Added system, updating tree' );
      this.updateSceneTree( this.scene );
    },

    removeSystem( idx ) {
      this.scene.systems.splice( idx, 1 );
      this.scene.update(0);
      this.scene.render();
      this.update();
      console.log( 'Removed system, updating tree' );
      this.updateSceneTree( this.scene );
    },

    updateEntityName() {
      this.selectedEntity.name = this.selectedSceneItem.name;
      this.update();
    },

    createPrefab( item ) {
      // Create a new file with this entity's configuration, including
      // children
      console.log( item.entity );
      console.log( this.scene.entities[ item.entity ].freeze() );

      // Open a new tab on the prefab editor?
    },
  },
});
</script>

<template>
  <div class="scene-toolbar">
    <div class="dropdown">
      <button class="btn btn-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="fa fa-file-circle-plus"></i>
        New Entity
      </button>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="#" @click="addEntity('Position')">Blank</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" href="#" @click="addEntity('Position','Sprite')">Sprite</a></li>
        <li><a class="dropdown-item" href="#" @click="addEntity('Position','OrthographicCamera')">Orthographic Camera</a></li>
      </ul>
    </div>
  </div>
  <div class="scene-tree">
    <ObjectTreeItem ref="tree" dragtype="entity" :item="sceneTree" :expand="true" :onclickitem="select">
      <template #menu="{item}">
        <div class="dropdown dropend filetree-dropdown" @click.prevent.stop="hideFileDropdown">
          <i class="fa-solid fa-ellipsis-vertical scene-tree-item-menu" @click.prevent.stop="showFileDropdown"
            data-bs-toggle="dropdown"
            data-bs-config='{ "popperConfig": { "strategy": "fixed" }}'></i>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" @click="createPrefab(item)">Create Prefab</a></li>
            <li><a class="dropdown-item" href="#" @click="deleteFile(item)">Delete</a></li>
          </ul>
        </div>
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
</template>

<style>
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

  .scene-tree-item-menu {
    display: block;
    height: 100%;
    padding: 0 6px;
    font-size: 1.3em;
  }
</style>
