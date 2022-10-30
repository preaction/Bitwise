<script lang="ts">
import { defineComponent, toRaw, markRaw } from "vue";
import { mapStores, mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
import ObjectTreeItem from './ObjectTreeItem.vue';

export default defineComponent({
  components: {
    ObjectTreeItem,
  },
  props: ['scene', 'isPrefab'],
  emits: ['update'],
  data() {
    return {
      sceneTree: {},
      selectedSceneItem: null,
      selectedEntity: null,
      selectedComponents: {},
      sceneSystems: [],
      icons: {
        "default": "fa-cube",
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
    ...mapStores(useAppStore),
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
          tree[id] = { entity: null, children: [], path: id };
        }
        tree[id].entity = id;
        tree[id].name = entity.name;
        tree[id].icon = this.icons[ entity.type ] || this.icons.default;

        const pid = scene.components.Position.store.pid[id];
        if ( pid < 2**32-1 ) {
          console.log( `Parenting to ${pid}` );
          if ( !tree[pid] ) {
            tree[pid] = { entity: null, children: [], path: pid };
          }
          tree[id].path = [ pid, tree[id].path ].join('/');
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
          parent: 2**32-1,
          children: Object.values(tree),
        };
        // Update the systems array
        this.sceneSystems = scene.systems.map( s => ({ name: s.name, data: s.freeze() }) );
      }

      this.select( this.sceneTree );
    },

    select(item) {
      if ( !this.isPrefab && this.sceneTree === item ) {
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
      this.$emit('update');
    },

    removeComponent( name:string ) {
      if ( confirm( 'Are you sure?' ) ) {
        this.selectedEntity.removeComponent(name);
        this.$emit('update');
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
      this.$emit('update');
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
      this.$emit('update');
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
        this.$refs.tree.removeItem(item);
        this.$emit('update');
      }
    },

    updateSystem( idx:number, data:Object ) {
      this.scene.systems[idx].thaw( data );
      this.$emit('update');
    },

    dragOverEntity( event ) {
      // Drag over left half, adjacent to over.
      // Drag over right half, child of over.
      //const targetLeft = event.target.getBoundingClientRect().left;
      //const rowLeft = event.currentTarget.getBoundingClientRect().left;
      //const rowWidth = event.currentTarget.clientWidth;
      //const rowOffsetX = event.offsetX + ( targetLeft - rowLeft );
      // XXX: Show indicator: Adjacent circle at left, child-of circle indented
      //for ( const node of event.currentTarget.parentNode.querySelectorAll('.entity-drop-top,.entity-drop') ) {
        //node.classList.remove('entity-drop');
        //node.classList.remove('entity-drop-top');
      //}
      //const isChild = rowOffsetX > rowWidth / 2
    },

    dropEntity( event ) {
      const data = event.dataTransfer.getData("bitwise/entity");
      if ( data ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        // Drag over left half, adjacent to over.
        // Drag over right half, child of over.
        const targetLeft = event.target.getBoundingClientRect().left;
        const rowLeft = event.currentTarget.getBoundingClientRect().left;
        const rowWidth = event.currentTarget.clientWidth;
        const rowOffsetX = event.offsetX + ( targetLeft - rowLeft );
        const isChild = rowOffsetX > rowWidth / 2

        const dragPid = data.indexOf( '/' ) >= 0 ? data.split('/').pop() : data;
        const dropPath = event.currentTarget.dataset.path;
        let dropPid = 2**32-1;
        if ( dropPath && dropPath.indexOf( '/' ) >= 0 ) {
          if ( isChild ) {
            dropPid = dropPath.split('/').pop();
          }
          else {
            dropPid = dropPath.split('/').slice(-2, 1)[0];
          }
        }
        else if ( typeof dropPath !== 'undefined' && isChild ) {
          dropPid = dropPath;
        }
        console.log( 'dropping entity on parent', isChild, dragPid, dropPid );
        this.scene.components.Position.store.pid[dragPid] = dropPid;
        this.updateSceneTree(this.scene);
        // XXX: Expand dropPid if not root
        this.$emit('update');
      }
      else {
        event.dataTransfer.dropEffect = "";
      }
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
        this.$emit('update');
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
      this.$emit('update');
      console.log( 'Added system, updating tree' );
      this.updateSceneTree( this.scene );
    },

    removeSystem( idx ) {
      this.scene.systems.splice( idx, 1 );
      this.$emit('update');
      console.log( 'Removed system, updating tree' );
      this.updateSceneTree( this.scene );
    },

    updateEntityName() {
      this.selectedEntity.name = this.selectedSceneItem.name;
      this.emit('update');
    },

    createPrefab( item ) {
      // Create a new file with this entity's configuration, including
      // children
      const eData = this.scene.entities[ item.entity ].freeze();
      const filename = eData.name + '.json';
      const suffix = 1;
      while ( this.appStore.projectItems.includes( filename ) ) {
        filename = eData.name + (suffix++) + '.json';
      }
      // Don't write the file yet, just open a new tab on the prefab
      // editor
      this.appStore.openTab({
        src: filename,
        name: filename.replace( '.json', '' ),
        component: "PrefabEdit",
        icon: this.appStore.icons["PrefabEdit"],
        ext: '.json',
        data: eData,
        edited: true,
      });
    },
  },
});
</script>

<template>
  <div class="scene-panel">
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
      <ObjectTreeItem ref="tree" dragtype="entity" :item="sceneTree" :expand="true" :onclickitem="select"
        :ondragover="dragOverEntity" :ondropitem="dropEntity"
      >
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
  </div>
</template>

<style>
  .scene-panel {
    display: flex;
    flex-flow: column;
    font-size: 0.9em;
    grid-area: sidebar;
    padding: 2px;
    width: 200px;
    background: var(--bs-light);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%);
    overflow: hidden;
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

  .scene-tree-item-menu {
    display: block;
    height: 100%;
    padding: 0 6px;
    font-size: 1.3em;
  }

  .entity-drop, .entity-drop-top {
    position: relative;
  }
  .entity-drop {
    border-bottom: 3px dashed #69b6d5;
  }
  .entity-drop-top {
    border-top: 3px dashed #69b6d5;
  }
  .entity-drop::before, .entity-drop-top::before {
     content: '';
     display: block;
     width: 10px;
     height: 10px;
     border-radius: 5px;
     background-color: #69b6d5;
     position: absolute;
     left: -2.5px;
  }
  .entity-drop::before {
    top: 100%;
  }
  .entity-drop-top::before {
    bottom: 100%;
  }

</style>
