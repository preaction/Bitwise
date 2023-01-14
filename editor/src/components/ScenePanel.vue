<script lang="ts">
import { defineComponent, toRaw, markRaw } from "vue";
import { mapStores, mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
import ObjectTreeItem from './ObjectTreeItem.vue';
import MenuButton from "./MenuButton.vue";

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
  emits: ['update:modelValue', 'update'],
  data() {
    return {
      sceneData: JSON.parse( JSON.stringify( toRaw( this.modelValue ) ) ),
      // XXX: sceneTree should not be stored, but should be a computed
      // value so it is automatically recalculated
      sceneTree: {},
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
    this.updateSceneTree();
    this.select( this.sceneTree );
  },
  computed: {
    ...mapStores(useAppStore),
    ...mapState( useAppStore, ['components', 'systems', 'componentForms', 'systemForms'] ),
    availableComponents() {
      return Object.keys( this.components ).filter( c => !this.components[c].isNull && !this.components[c].isHidden );
    },
    availableSystems() {
      return Object.keys( this.systems ).filter( s => !this.systems[s].isNull && !s.match(/^Editor/) );
    },
    selectedEntityComponents() {
      if ( !this.selectedEntityData ) {
        return {};
      }
      const components = [];
      for ( const c in this.selectedEntityData ) {
        // These fields in entity data are not components
        if ( [ 'name', 'type', 'path', 'id', 'active' ].indexOf( c ) >= 0 ) {
          continue;
        }
        components.push(c);
      }
      return components;
    },
  },

  methods: {
    refresh() {
      this.updateSceneTree();
    },
    updateSceneTree() {
      // Find all the entities and build tree items for them
      const rootNode = {
        name: '',
        path: '',
        icon: '',
        data: {},
        children: [],
      };
      for ( const entity of this.sceneData.entities ) {
        const pathParts = entity.path.split(/\//);
        let treeNode = rootNode;
        while ( pathParts.length > 0 ) {
          const pathPart = pathParts.shift();
          let leafNode = treeNode.children.find( node => node.name === pathPart );
          if ( !leafNode ) {
            leafNode = {
              children: [],
            };
            treeNode.children.push( leafNode );
          }
          treeNode = leafNode;
        }

        treeNode.data = entity;
        treeNode.name = entity.name;
        treeNode.path = entity.path;
        treeNode.icon = this.icons[ entity.type ] || this.icons.default;
      }

      if ( this.isPrefab ) {
        this.sceneTree = rootNode.children[0];
      }
      else {
        this.sceneTree = {
          ...rootNode,
          name: this.sceneData?.name || 'New Scene',
          icon: 'fa-film',
        };
      }
    },

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
      for ( const pathPart of pathParts ) {
        item = item.children.find( i => i.name === pathPart );
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
      this.selectedEntityData[name] = data;
      this.selectedEntity.setComponent(name, toRaw(data));
      this.update();
    },

    removeComponent( name:string ) {
      if ( confirm( 'Are you sure?' ) ) {
        delete this.selectedEntityData[name];
        this.selectedEntity.removeComponent(name);
        this.update();
      }
    },

    hasComponent( name:string ) {
      // XXX: This should be named "canAddComponent" and should dispatch
      // a call to the component object so a component can decide that
      // it is not compatible with other components.
      return name in this.selectedEntityData;
    },

    addComponent( name:string ) {
      if ( this.hasComponent(name) ) {
        return;
      }
      this.selectedEntityData[name] = {};
      this.selectedEntity.addComponent(name);
      this.update();
    },

    addEntity( ...components:string[] ) {
      const entityData:{ [key:string]: any } = {
        name: 'New Entity',
        path: 'New Entity',
      };
      for ( const c of components ) {
        entityData[c] = {};
      }
      if ( this.isPrefab ) {
        entityData.path = `${this.sceneTree.path}/${entityData.path}`;
      }
      this.sceneData.entities.push( entityData );
      this.updateSceneTree();
      this.update();

      const entity = this.scene.addEntity();
      entity.thaw( entityData );

      this.selectByPath(entityData.path);
    },

    updateName( event ) {
      const name = event.target.value;
      this.sceneTree.name = name;
      this.scene.name = name;
      this.sceneData.name = name;
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
        for ( let i = 0; i < this.sceneData.entities.length; i++ ) {
          if ( this.sceneData.entities[i].path === entityData.path ) {
            this.sceneData.entities.splice( i, 1 );
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
      const entityData = item.data;
      const entity = this.scene.addEntity();
      entity.thaw( entityData );
      this.sceneData.entities.push( entity.freeze() );
      this.updateSceneTree();
      this.update();
    },

    updateSystem( idx:number, data:Object ) {
      this.sceneData.systems[idx].data = data;
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

        // First, fix the scene to reparent the dragged entity
        const dragEntity = this.scene.getEntityByPath(data);
        const dropEntity = this.scene.getEntityByPath(onItem.path);

        dragEntity.parent = isChild ? dropEntity : dropEntity.parent;
        // XXX: Adjust Transform to offset from parent so that entity
        // stays in same place visually

        // Then we can update the data with the new path (XXX: and
        // Transform)
        const dragEntityData = this.getEntityDataByPath(data);
        dragEntityData.path = dragEntity.path;

        this.updateSceneTree();
        // XXX: Expand dropEntity in scene tree if not root

        this.update();
      }
      else {
        event.dataTransfer.dropEffect = "";
      }
    },

    getEntityDataByPath( path:string ) {
      const pathParts = path.split(/\//);
      let treeNode = this.sceneTree;
      while ( pathParts.length > 0 ) {
        const pathPart = pathParts.shift();
        let leafNode = treeNode.children.find( node => node.name === pathPart );
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
        const systemData = this.sceneData.systems.splice(data, 1);
        this.sceneData.systems.splice( index, 0, ...systemData );
        const system = this.scene.systems.splice(data, 1);
        this.scene.systems.splice( index, 0, ...system );
        this.update();
      }
    },

    hasSystem( name:string ) {
      return !!this.sceneData.systems.find( s => s.name === name );
    },

    addSystem( name:string ) {
      if ( this.hasSystem(name) ) {
        return;
      }
      this.scene.addSystem( name );
      this.sceneData.systems.push( this.scene.systems[ this.scene.systems.length - 1 ].freeze() );
      this.update();
    },

    removeSystem( idx:number ) {
      this.sceneData.systems.splice( idx, 1 );
      this.scene.systems.splice( idx, 1 );
      this.update();
      this.updateSceneTree();
    },

    updateEntityName() {
      const newName = this.selectedSceneItem.name;
      if ( newName != this.selectedEntityData.name ) {
        this.selectedEntity.name = newName;
        this.selectedEntityData.name = newName;
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

    update() {
      this.$emit( 'update:modelValue', {
        ...toRaw(this.sceneData),
        name: this.sceneTree.name,
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
          <li @click="addEntity('Transform','UI')">UI Element</li>
          <li @click="addEntity('Transform','UI','UIImage')">UI Image</li>
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
          <component :is="componentForms[name]" v-model="selectedEntityData[name]"
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
        <input v-model="sceneTree.name" @input="updateName" class="flex-fill text-end col-1" pattern="^[^/]+$" />
      </div>
      <div v-for="s, idx in sceneData.systems" :key="s.name" class="system-form">
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
