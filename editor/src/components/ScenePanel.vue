<script lang="ts">
import { defineComponent, toRaw, markRaw } from "vue";
import { mapStores, mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
import ObjectTreeItem from './ObjectTreeItem.vue';
import MenuButton from "./MenuButton.vue";

export default defineComponent({
  components: {
    ObjectTreeItem,
    MenuButton,
  },
  props: ['scene', 'isPrefab'],
  emits: ['update'],
  data() {
    return {
      sceneTree: {},
      selectedSceneItem: null,
      selectedEntity: null,
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
        this.updateSceneTree(newScene);
        this.select( this.sceneTree );
      }
    }
  },
  mounted() {
    if ( this.scene ) {
      this.updateSceneTree( this.scene );
      this.select( this.sceneTree );
    }
  },
  computed: {
    ...mapStores(useAppStore),
    ...mapState( useAppStore, ['components', 'systems', 'componentForms', 'systemForms'] ),
    availableComponents() {
      return Object.keys( this.components ).filter( c => !this.components[c].isNull );
    },
    availableSystems() {
      return Object.keys( this.systems ).filter( s => !this.systems[s].isNull && !s.match(/^Editor/) );
    },
    selectedComponents() {
      if ( !this.selectedEntity ) {
        return {};
      }
      const components = {};
      for ( const c of this.selectedEntity.listComponents() ) {
        components[c] = this.selectedEntity.getComponent(c);
      }
      return components;
    },
  },

  methods: {
    refresh() {
      this.updateSceneTree( this.scene );
    },
    updateSceneTree(scene:Scene) {
      // Find all the entities and build tree items for them
      const tree = {};
      for ( const id of scene.eids ) {
        const entity = scene.entities[id];
        if ( !tree[id] ) {
          tree[id] = { entity: null, children: [] };
        }
        tree[id].entity = id;
        tree[id].name = entity.name;
        tree[id].path = entity.name;
        tree[id].icon = this.icons[ entity.type ] || this.icons.default;

        const pid = scene.components.Position.store.pid[id];
        if ( pid < 2**32-1 ) {
          if ( !tree[pid] ) {
            tree[pid] = { entity: null, children: [], path: scene.entities[ pid ].name };
          }
          tree[id].path = [ tree[pid].path, tree[id].path ].join('/');
          tree[pid].children.push( tree[id] );
          delete tree[id];
        }
      }

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
    },

    select(item) {
      if ( !this.isPrefab && this.sceneTree === item ) {
        this.selectedEntity = null;
        this.selectedSceneItem = null;
        return;
      }
      this.selectedSceneItem = item;
      this.selectEntity( this.scene.entities[item.entity] );
    },

    selectEntity(entity) {
      this.selectedEntity = entity;
    },

    updateComponent( name:string, data:Object ) {
      this.selectedEntity.setComponent(name, toRaw(data));
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
      this.updateSceneTree(this.scene);
      const entityItem = this.sceneTree.children[ this.sceneTree.children.length - 1 ];
      this.select( entityItem );
      this.$emit('update');
    },

    updateName( event ) {
      const name = event.target.value;
      this.sceneTree.name = name;
      this.scene.name = name;
      this.$emit('update');
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

    duplicateEntity( item ) {
      const scene = this.scene;
      const entity = scene.entities[ item.entity ];
      const newEntity = scene.addEntity();
      newEntity.thaw( entity.freeze() );
      this.updateSceneTree( scene );
      this.$emit('update');
    },

    updateSystem( idx:number, data:Object ) {
      this.scene.systems[idx].thaw( data );
      this.$emit('update');
    },

    dragOverEntity( event, item ) {
      // Drag over left half, adjacent to over.
      // Drag over right half, child of over.
      const targetLeft = event.target.getBoundingClientRect().left;
      const rowLeft = event.currentTarget.getBoundingClientRect().left;
      const rowWidth = event.currentTarget.clientWidth;
      const rowOffsetX = event.offsetX + ( targetLeft - rowLeft );
      const isChild = rowOffsetX > rowWidth / 4

      // Show indicator: Adjacent circle at left, child-of circle indented
      for ( const node of event.currentTarget.parentNode.querySelectorAll('.entity-drop-top,.entity-drop') ) {
        node.classList.remove('entity-drop');
        node.classList.remove('entity-drop-top');
      }
    },

    dropEntity( event, onItem ) {
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
        const isChild = rowOffsetX > rowWidth / 4;

        const dragEntity = this.scene.getEntityByPath(data);
        const dropEntity = this.scene.getEntityByPath(onItem.path);
        console.log( `Drop ${data} on ${onItem.path} (${dropEntity.id}) ${ isChild ? 'as child' : 'as sibling' }` );

        const dropPid = isChild ? dropEntity.id : this.scene.components.Position.store.pid[dropEntity.id];
        this.scene.components.Position.store.pid[dragEntity.id] = dropPid;
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
        const system = this.scene.systems.splice(data, 1);
        this.scene.systems.splice( index, 0, ...system );
        this.$emit('update');
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
      this.updateSceneTree( this.scene );
    },

    removeSystem( idx ) {
      this.scene.systems.splice( idx, 1 );
      this.$emit('update');
      this.updateSceneTree( this.scene );
    },

    updateEntityName() {
      const newName = this.selectedSceneItem.name;
      if ( newName != this.selectedEntity.name ) {
        this.selectedEntity.name = newName;
        this.$emit('update');
      }
    },

    createPrefab( item ) {
      // Create a new file with this entity's configuration, including
      // children
      const eData = this.scene.entities[ item.entity ].freeze();
      let filename = eData.name + '.json';
      let suffix = 1;
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
      <MenuButton placement="left-start">
        <template #title>
          <i class="fa fa-file-circle-plus"></i>
          New Entity
        </template>
        <ul>
          <li @click="addEntity('Position')">Blank</li>
          <li class="hr"><hr></li>
          <li @click="addEntity('Position','Sprite')">Sprite</li>
          <li @click="addEntity('Position','OrthographicCamera')">Orthographic Camera</li>
        </ul>
      </MenuButton>
    </div>
    <div class="scene-tree">
      <ObjectTreeItem ref="tree" dragtype="entity" :item="sceneTree" :expand="true" :onclickitem="select"
        :ondragover="dragOverEntity" :ondropitem="dropEntity"
      >
        <template #menu="{item}">
          <MenuButton>
            <template #button>
              <i class="fa-solid fa-ellipsis-vertical scene-tree-item-menu-button"></i>
            </template>
            <ul>
              <li @click="createPrefab(item)">Create Prefab</li>
              <li @click="duplicateEntity(item)">Duplicate</li>
              <li @click="deleteEntity(item)">Delete</li>
            </ul>
          </MenuButton>
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
      <div v-for="c in selectedEntity.listComponents()" class="component-form" :key="selectedEntity.id + c">
        <div class="mb-1 d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center">
            <h6 class="m-0">{{ c }}</h6>
            <i v-if="!components[c]" class="ms-1 fa fa-file-circle-question" title="Component not found" ></i>
          </div>
          <i @click="removeComponent(c)" class="fa fa-close me-1 icon-button"></i>
        </div>
        <div v-if="componentForms[c]" class="component-form__body">
          <component :is="componentForms[c]" v-model="selectedComponents[c]"
            :scene="scene" @update="updateComponent(c, $event)"
          />
        </div>
      </div>
      <MenuButton class="button-center" title="Add Component...">
        <ul>
          <li v-for="c in availableComponents" :class="hasComponent(c) ? 'disabled' : ''" @click="addComponent(c)">{{c}}</li>
        </ul>
      </MenuButton>
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
          <div class="d-flex align-items-center">
            <h6 class="m-0"><i class="fa fa-ellipsis-vertical system-move"></i><i class="fa fa-ellipsis-vertical system-move"></i> {{ s.name }}</h6>
            <i v-if="s.isNull" class="ms-1 fa fa-file-circle-question" title="System not found" ></i>
          </div>
          <i @click="removeSystem(idx)" class="fa fa-close me-1 icon-button"></i>
        </div>
        <div v-if="systemForms[s.name]" class="system-form__body">
          <component :is="systemForms[s.name]" v-model="s.data" :scene="scene"
            @update="updateSystem(idx, $event)" />
        </div>
      </div>
      <MenuButton class="button-center" title="Add System...">
        <ul>
          <li v-for="s in availableSystems" :class="hasSystem(s) ? 'disabled' : ''" @click="addSystem(s)">{{s}}</li>
        </ul>
      </MenuButton>
    </div>
  </div>
</template>

<style>
  body .scene-panel {
    display: flex;
    flex-flow: column;
    font-size: 0.9em;
    grid-area: sidebar;
    width: 100%;
    background: var(--bw-border-color);
    overflow: hidden;
    height: 100%;
  }

  .scene-toolbar {
    flex: 0 0 auto;
    background: var(--bw-border-color);
  }

  .scene-tree {
    background: var(--bw-background-color);
    margin: 0.3em 0;
    overflow: scroll;
    flex: 1 1 25%;
  }
  .entity-pane {
    flex: 1 1 75%;
    overflow: scroll;
  }

  .component-form__body {
    padding: 0.2em;
    background: var(--bw-background-color);
  }
  .system-form__body {
    padding: 0.2em;
    background: var(--bw-background-color);
  }

  .system-move {
    cursor: move;
  }
  .icon-button {
    cursor: pointer;
  }

  .scene-tree-item-menu-button {
    display: inline-block;
    height: 100%;
    padding: 0 0.25em;
    font-size: 1.3em;
    vertical-align: middle;
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

  .button-center {
    display: block;
    margin-left: auto;
    margin-right: auto;
    width: fit-content;
  }

</style>
