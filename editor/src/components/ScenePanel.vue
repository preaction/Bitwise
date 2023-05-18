<script lang="ts">
import { defineComponent, toRaw, markRaw } from "vue";
import ObjectTreeItem from './ObjectTreeItem.vue';
import MenuButton from "./MenuButton.vue";
import type {Scene} from "@fourstar/bitwise";

/**
 * ScenePanel handles showing the scene entity tree and rendering the
 * forms needed to edit scene systems and entity components. Changes
 * made to the scene data by the ScenePanel are also made to the running
 * scene.
 */
export default defineComponent({
  components: {
    ObjectTreeItem,
    MenuButton,
  },
  props: ['modelValue', 'scene', 'isPrefab'],
  emits: {'update:modelValue': null, 'update': null},

  inject: ['systemForms', 'componentForms'],
  data() {
    return {
      selectedSceneItem: null,
      selectedEntityData: null,
      selectedEntity: null,
      icons: {
        "default": "fa-cube",
        "Camera": "fa-camera",
        "Sprite": "fa-image-portrait",
      },
    }
  },
  mounted() {
    this.select( this.sceneTree );
  },
  computed: {
    sceneTree() {
      // Find all the entities and build tree items for them
      const rootNode = {
        path: '',
        icon: '',
        data: {},
        children: [],
      };
      for ( const entity of this.modelValue?.entities ?? [] ) {
        const pathParts = entity.path.split(/\//);
        let treeNode = rootNode;
        for ( let i = 0; i < pathParts.length; i++ ) {
          const findPath = pathParts.slice(0, i+1).join( '/' );
          let leafNode = treeNode.children.find( node => node.path === findPath );
          if ( !leafNode ) {
            leafNode = {
              name: findPath.split('/').pop(),
              path: findPath,
              children: [],
            };
            treeNode.children.push( leafNode );
          }
          treeNode = leafNode;
        }

        treeNode.data = entity;
        treeNode.path = entity.path;
        treeNode.icon = this.icons[ entity.type ] || this.icons.default;
      }

      let sceneTree = this.isPrefab
        ? rootNode.children[0]
        : {
          ...rootNode,
          name: this.modelValue?.name,
          icon: 'fa-film',
        };
      return sceneTree;
    },
    components() {
      return this.scene?.game.components || {};
    },
    systems() {
      return this.scene?.game.systems || {};
    },
    availableComponents() {
      return Object.keys( this.components ).filter( c => !this.components[c].isNull && !this.components[c].isHidden );
    },
    availableSystems() {
      return Object.keys( this.systems ).filter( s => !this.systems[s].isNull && !s.match(/^Editor/) );
    },
    selectedEntityComponents() {
      if ( !this.selectedEntityData ) {
        return [];
      }
      return Object.keys( this.selectedEntityData.components );
    },
  },

  methods: {
    select(item) {
      if ( !this.isPrefab && this.sceneTree === item ) {
        this.selectedEntity = null;
        this.selectedEntityData = null;
        this.selectedSceneItem = null;
        return;
      }
      this.selectedSceneItem = item;
      this.selectEntity( item.data );
    },

    selectByPath(path:string) {
      const pathParts = path.split(/\//);
      let item = this.sceneTree;
      for ( let i = 0; i < pathParts.length; i++ ) {
        const findPath = pathParts.slice(0, i+1).join( '/' );
        item = item.children.find( i => i.path === findPath );
      }
      this.select(item);
    },

    selectEntity(entityData:any) {
      if ( !("active" in entityData) ) {
        entityData.active = true;
      }
      this.selectedEntityData = entityData;
      this.selectedEntity = this.scene.getEntityByPath( entityData.path );
      // XXX: Listen for updates to entity data
    },

    updateComponent( name:string, data:Object ) {
      this.selectedEntityData.components[name] = data;
      this.selectedEntity.setComponent(name, toRaw(data));
      this.update();
    },

    removeComponent( name:string ) {
      if ( confirm( 'Are you sure?' ) ) {
        delete this.selectedEntityData.components[name];
        this.selectedEntity.removeComponent(name);
        this.update();
      }
    },

    hasComponent( name:string ) {
      // XXX: This should be named "canAddComponent" and should dispatch
      // a call to the component object so a component can decide that
      // it is not compatible with other components.
      return name in this.selectedEntityData.components;
    },

    addComponent( name:string ) {
      if ( this.hasComponent(name) ) {
        return;
      }
      this.selectedEntityData.components[name] = {};
      this.selectedEntity.addComponent(name);
      this.update();
    },

    addEntity( ...components:string[] ) {
      const entityData:{ [key:string]: any } = {
        path: 'New Entity',
        components: {},
      };
      for ( const c of components ) {
        entityData.components[c] = {};
      }
      if ( this.isPrefab ) {
        entityData.path = `${this.sceneTree.path}/${entityData.path}`;
      }
      // XXX: Fix this to ensure entity path is unique before adding
      // entity
      this.modelValue.entities.push( entityData );

      const entity = this.scene.addEntity();
      entity.thaw( entityData );

      this.selectByPath(entityData.path);

      this.update();
    },

    updateName( event ) {
      const name = event.target.value;
      this.sceneTree.name = name;
      this.scene.name = name;
      this.modelValue.name = name;
      this.update();
    },

    updateActive( event ) {
      const active = event.target.checked;
      this.selectedEntityData.active = active;
      this.selectedEntity.active = active;
      this.update();
    },

    deleteEntity( item ) {
      if ( confirm( `Are you sure you want to delete "${item.name}"?` ) ) {
        const entityData = item.data;
        if ( this.selectedEntity?.path === entityData.path ) {
          this.select( this.sceneTree );
        }
        for ( let i = 0; i < this.modelValue.entities.length; i++ ) {
          if ( this.modelValue.entities[i].path === entityData.path ) {
            this.modelValue.entities.splice( i, 1 );
            break;
          }
        }
        const entity = this.scene.getEntityByPath( entityData.path );
        this.scene.removeEntity( entity.id );
        this.$refs.tree.removeItem(item);
        this.update();
      }
    },

    duplicateEntity( item ) {
      const entityData = JSON.parse( JSON.stringify( item.data ) );
      const match = entityData.path.match( /\((\d+)\)$/ );
      if ( match ) {
        entityData.path = entityData.path.replace( /\(\d+\)$/, `(${parseInt(match[1])+1})` );
      }
      else {
        entityData.path += ' (2)';
      }
      const entity = this.scene.addEntity();
      entity.thaw( entityData );
      this.modelValue.entities.push( entity.freeze() );
      this.update();
    },

    updateSystem( idx:number, data:Object ) {
      this.modelValue.systems[idx].data = data;
      this.scene.systems[idx].thaw( data );
      this.update();
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

        // Update the data with the new path
        const dragEntity = this.scene.getEntityByPath(data);
        const dropEntity = this.scene.getEntityByPath(onItem.path);
        let newPath = [ isChild ? dropEntity.path : dropEntity.parent?.path, dragEntity.name ].filter( p => !!p ).join('/');
        const dragEntityData = this.getEntityDataByPath(data);
        dragEntityData.path = newPath;
        // XXX: Adjust Transform to offset from parent so that entity
        // stays in same place visually

        // Then we remove the old entity and add the new entity, to make
        // sure it gets reparented
        dragEntity.remove();
        const newEntity = dropEntity.scene.addEntity();
        newEntity.thaw(dragEntityData);

        // XXX: Expand dropEntity in scene tree if not root
        // XXX: Focus dragEntity in scene tree

        this.update();
      }
      else {
        event.dataTransfer.dropEffect = "";
      }
    },

    getEntityDataByPath( path:string ) {
      // XXX: Fix this to only use entityData.path
      const pathParts = path.split(/\//);
      let treeNode = this.sceneTree;
      for ( let i = 0; i < pathParts.length; i++ ) {
        const findPath = pathParts.slice(0, i+1).join( '/' );
        let leafNode = treeNode.children.find( node => node.path === findPath );
        if ( !leafNode ) {
          return null;
        }
        treeNode = leafNode;
      }
      return treeNode.data;
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
        const systemData = this.modelValue.systems.splice(data, 1);
        this.modelValue.systems.splice( index, 0, ...systemData );
        const system = this.scene.systems.splice(data, 1);
        this.scene.systems.splice( index, 0, ...system );
        this.update();
      }
    },

    hasSystem( name:string ) {
      return !!this.modelValue?.systems?.find( s => s.name === name );
    },

    addSystem( name:string ) {
      if ( this.hasSystem(name) ) {
        return;
      }
      this.scene.addSystem( name );
      this.modelValue.systems.push({
        name,
        data: this.scene.systems[ this.scene.systems.length - 1 ].freeze(),
      });
      this.update();
    },

    removeSystem( idx:number ) {
      this.modelValue.systems.splice( idx, 1 );
      this.scene.systems.splice( idx, 1 );
      this.update();
    },

    updateEntityName() {
      const newName = this.selectedSceneItem.name;
      if ( newName != this.selectedEntity.name ) {
        this.selectedEntity.name = newName;
        const path = this.selectedEntityData.path;
        const pathParts = path.split('/').slice(0, -1);
        pathParts.push(newName);
        const newPath = pathParts.join( '/' );
        this.selectedEntityData.path = newPath;
        this.update();
      }
    },

    createPrefab( item ) {
      // Create a new file with this entity's configuration, including
      // children
      const entity = this.scene.getEntityByPath( item.path );
      const eData = entity.freeze();
      const eName = eData.path.split('/').slice(0, -1)[0];
      let filename = eName + '.json';
      let suffix = 1;
      while ( this.appStore.projectItems.includes( filename ) ) {
        filename = eName + (suffix++) + '.json';
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

    update() {
      this.$emit( 'update:modelValue', {
        ...toRaw(this.modelValue),
        name: this.modelValue.name,
      } );
      this.$emit( 'update' );
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
          <li @click="addEntity('Transform')">Blank</li>
          <li class="hr"><hr></li>
          <li @click="addEntity('Transform','Sprite')">Sprite</li>
          <li @click="addEntity('Transform','OrthographicCamera')">Orthographic Camera</li>
          <li class="hr"><hr></li>
          <li @click="addEntity('Transform','UIElement')">UI Element</li>
          <li @click="addEntity('Transform','UIElement','UIImage')">UI Image</li>
          <li @click="addEntity('Transform','UIElement','UIText')">UI Text</li>
          <li @click="addEntity('Transform','UIElement','UIText','UIButton')">UI Button</li>
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
    <div class="entity-pane" v-if="selectedEntityData">
      <h5>{{ selectedEntityData.type || "Unknown Type" }}</h5>
      <div class="d-flex justify-content-between align-items-center">
        <label class="me-1">Name</label>
        <input class="flex-fill text-end col-1" v-model="selectedSceneItem.name"
          @keyup="updateEntityName" pattern="^[^/]+$"
        />
      </div>
      <div class="d-flex justify-content-between align-items-center">
        <label class="me-1">Active</label>
        <div class="flex-fill text-end col-1">
          <input type="checkbox" @change="updateActive" v-model="selectedEntityData.active" />
        </div>
      </div>
      <div v-for="name in selectedEntityComponents" class="component-form" :key="selectedEntityData.path + '/' + name">
        <div class="mb-1 d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center">
            <h6 class="m-0">{{ name }}</h6>
            <i v-if="!components[name]" class="ms-1 fa fa-file-circle-question" title="Component not found" ></i>
          </div>
          <i @click="removeComponent(name)" class="fa fa-close me-1 icon-button"></i>
        </div>
        <div v-if="componentForms[name]" class="component-form__body">
          <component :is="componentForms[name]" v-model="selectedEntityData.components[name]"
            :scene="scene" @update="updateComponent(name, $event)"
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
        <input v-model="modelValue.name" @input="updateName" class="flex-fill text-end col-1" pattern="^[^/]+$" />
      </div>
      <div v-for="s, idx in modelValue.systems" :key="s.name" class="system-form">
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
