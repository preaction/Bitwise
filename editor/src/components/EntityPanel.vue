<script lang="ts">
import { defineComponent, toRaw, markRaw } from "vue";
import type { PropType, Raw } from "vue";
import Tree from './Tree.vue';
import MenuButton from "./MenuButton.vue";
import type { Scene, Entity, EntityData } from "@fourstar/bitwise";

/**
 * ScenePanel handles showing the scene entity tree and rendering the
 * forms needed to edit scene systems and entity components. Changes
 * made to the scene data by the ScenePanel are also made to the running
 * scene.
 */
export default defineComponent({
  components: {
    Tree,
    MenuButton,
  },
  props: {
    modelValue: Object as PropType<Array<EntityData>>,
    scene: Object as PropType<Raw<Scene>>,
    isPrefab: Boolean,
  },
  emits: { 'update:modelValue': null },

  inject: ['componentForms', 'project', 'openTab'],
  data() {
    return {
      entities: [...(this.modelValue || [])],
      selectedEntityPath: "",
      selectedEntityData: undefined,
      selectedEntity: undefined,
    } as {
      entities: EntityData[],
      selectedEntityPath: string,
      selectedEntityData: EntityData | null | undefined,
      selectedEntity: Raw<Entity> | undefined,
    }
  },

  watch: {
    modelValue(newModelValue: EntityData[]) {
      this.entities = [...newModelValue];
      if (this.selectedEntityPath) {
        this.selectedEntityData = this.getEntityDataByPath(this.selectedEntityPath);
        if (this.selectedEntityData && this.selectedEntity) {
          this.selectedEntity.thaw(this.selectedEntityData);
        }
      }
    },
  },

  computed: {
    components() {
      return this.scene?.game.components || {};
    },

    availableComponents() {
      return Object.keys(this.components).filter(c => !this.components[c].isNull && !this.components[c].isHidden);
    },

    selectedEntityComponents() {
      if (!this.selectedEntityData) {
        return [];
      }
      return Object.keys(this.selectedEntityData.components || {});
    },
  },

  methods: {
    select(entityData: EntityData, path: string) {
      this.selectedEntityPath = path;
      this.selectedEntityData = entityData;
      const entity = this.scene?.getEntityByPath(path);
      if (!entity) {
        throw "No entity found in scene for path: " + path;
      }
      this.selectedEntity = markRaw(entity);
    },

    updateComponent(name: string, data: Object) {
      if (!this.selectedEntityData || !this.selectedEntity) return;
      this.selectedEntityData.components ??= {}
      this.selectedEntityData.components[name] = data;
      this.selectedEntity.setComponent(name, toRaw(data));
      this.update();
    },

    removeComponent(name: string) {
      if (!this.selectedEntityData || !this.selectedEntity) return;
      if (confirm('Are you sure?')) {
        this.selectedEntityData.components ??= {}
        delete this.selectedEntityData.components[name];
        this.selectedEntity.removeComponent(name);
        this.update();
      }
    },

    hasComponent(name: string) {
      if (!this.selectedEntityData || !this.selectedEntity) return;
      this.selectedEntityData.components ??= {}
      // XXX: This should be named "canAddComponent" and should dispatch
      // a call to the component object so a component can decide that
      // it is not compatible with other components.
      return name in this.selectedEntityData.components;
    },

    addComponent(name: string) {
      if (!this.selectedEntityData || !this.selectedEntity) return;
      if (this.hasComponent(name)) {
        return;
      }
      this.selectedEntityData.components ??= {}
      this.selectedEntityData.components[name] = {};
      this.selectedEntity.addComponent(name, {});
      this.update();
    },

    async addEntity(...components: string[]) {
      if (!this.scene) return;
      const entityData: EntityData = {
        $schema: '1',
        name: 'New Entity',
        active: true,
      };
      entityData.components = {};
      for (const c of components) {
        entityData.components[c] = {};
      }
      if (this.isPrefab) {
        this.entities[0].children ??= [];
        this.entities[0].children.push(entityData);
      }
      else {
        this.entities.push(entityData);
      }
      // XXX: Fix this to ensure entity path is unique before adding
      // entity

      const entity = this.scene.addEntity();
      await entity.thaw(entityData);

      this.selectedEntityPath = entity.path;
      this.selectedEntityData = entityData;
      this.selectedEntity = entity;

      this.update();
    },

    updateActive(event: Event) {
      if (!this.selectedEntityData || !this.selectedEntity) return;
      if (!(event.target instanceof HTMLInputElement)) return;
      const active = event.target.checked;
      this.selectedEntityData.active = active;
      this.selectedEntity.active = active;
      this.update();
    },

    deleteEntity(path: string) {
      const entityData = this.getEntityDataByPath(path);
      if (confirm(`Are you sure you want to delete "${entityData.name}"?`)) {
        if (this.selectedEntityData === entityData) {
          this.select(this.entities[0], this.entities[0].name);
        }
        this.visitEntityDataPath(path, (entityData, parentData) => {
          if (parentData) {
            parentData.children.splice(parentData.children.indexOf(entityData), 1);
          }
          else {
            this.entities.splice(this.entities.indexOf(entityData), 1);
          }
        });
        const entity = this.scene.getEntityByPath(path);
        if (entity) {
          this.scene.removeEntity(entity.id);
        }
        this.update();
      }
    },

    async duplicateEntity(entityData: EntityData) {
      entityData = JSON.parse(JSON.stringify(entityData));
      const match = entityData.name.match(/\((\d+)\)$/);
      if (match) {
        entityData.name = entityData.name.replace(/\(\d+\)$/, `(${parseInt(match[1]) + 1})`);
      }
      else {
        entityData.name += ' (2)';
      }
      const entity = this.scene.addEntity();
      await entity.thaw(entityData);
      entityData = entity.freeze();
      this.entities.push(entityData);
      this.selectedEntityPath = entity.path;
      this.selectedEntityData = entityData;
      this.selectedEntity = entity;
      this.update();
    },

    dragStart(event: DragEvent, item: EntityData, path: string) {
      event.dataTransfer.setData('bitwise/entity', path);
      const labelElem = event.currentTarget.querySelector('.label')
      event.dataTransfer?.setDragImage(labelElem, 10, 10)
    },

    dragOverEntity(event, item: EntityData) {
      // Drag over left half, adjacent to over.
      // Drag over right half, child of over.
      const targetLeft = event.target.getBoundingClientRect().left;
      const rowLeft = event.currentTarget.getBoundingClientRect().left;
      const rowWidth = event.currentTarget.clientWidth;
      const rowOffsetX = event.offsetX + (targetLeft - rowLeft);
      const isChild = rowOffsetX > rowWidth / 4

      const targetTop = event.target.getBoundingClientRect().top;
      const rowTop = event.currentTarget.getBoundingClientRect().top;
      const rowHeight = event.currentTarget.clientHeight;
      const rowOffsetY = event.offsetY + (targetTop - rowTop);
      const isAfter = rowOffsetY > rowHeight / 2;

      // Show indicator: Adjacent circle at left, child-of circle indented
      for (const node of event.currentTarget.closest('.tree-root').parentNode.querySelectorAll('.entity-drop-top,.entity-drop,.entity-drop-child')) {
        node.classList.remove('entity-drop');
        node.classList.remove('entity-drop-top');
        node.classList.remove('entity-drop-child');
      }
      event.currentTarget.classList.add(isChild ? 'entity-drop-child' : isAfter ? 'entity-drop' : 'entity-drop-top');
    },

    async dropEntity(event: DragEvent, onItem: EntityData, path: string) {
      const data = event.dataTransfer.getData("bitwise/entity");
      if (data) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        for (const node of event.currentTarget.closest('.tree-root').parentNode.querySelectorAll('.entity-drop-child,.entity-drop-top,.entity-drop')) {
          node.classList.remove('entity-drop');
          node.classList.remove('entity-drop-top');
          node.classList.remove('entity-drop-child');
        }

        // Drag over left half, adjacent to over.
        // Drag over right half, child of over.
        const targetLeft = event.target.getBoundingClientRect().left;
        const rowLeft = event.currentTarget.getBoundingClientRect().left;
        const rowWidth = event.currentTarget.clientWidth;
        const rowOffsetX = event.offsetX + (targetLeft - rowLeft);
        const isChild = rowOffsetX > rowWidth / 4;

        const targetTop = event.target.getBoundingClientRect().top;
        const rowTop = event.currentTarget.getBoundingClientRect().top;
        const rowHeight = event.currentTarget.clientHeight;
        const rowOffsetY = event.offsetY + (targetTop - rowTop);
        const isAfter = rowOffsetY > rowHeight / 2;

        // Update the data with the new path
        const dragEntity = this.scene.getEntityByPath(data);
        const dropEntity = this.scene.getEntityByPath(path);

        const dragEntityData = this.getEntityDataByPath(data);
        // Remove the dragged entity from its current position
        if (dragEntity.parent) {
          const dragParentData = this.getEntityDataByPath(dragEntity.parent.path)
          dragParentData.children.splice(dragParentData.children.indexOf(dragEntityData), 1);
          if (!dragParentData.children.length) {
            delete dragParentData.children;
          }
        }
        else {
          this.entities.splice(this.entities.indexOf(dragEntityData), 1);
        }
        dragEntity.remove();

        // Put it in its new position
        if (isChild) {
          const dropEntityData = this.getEntityDataByPath(path);
          dropEntityData.children ??= [];
          dropEntityData.children.push(dragEntityData);
          const newEntity = dropEntity.addEntity();
          await newEntity.thaw(dragEntityData);
        }
        else {
          let dropDest: Array<EntityData>, destEntity: Entity;
          if (dropEntity.parent) {
            destEntity = dropEntity.parent.addEntity();
            dropDest = this.getEntityDataByPath(dropEntity.parent.path).children ??= [];
          }
          else {
            destEntity = this.scene.addEntity();
            dropDest = this.entities;
          }
          dropDest.splice(dropDest.findIndex(e => e.name === dropEntity.name) + (isAfter ? 1 : 0), 0, dragEntityData);
          await destEntity.thaw(dragEntityData);
        }

        // XXX: Adjust Transform to offset from parent so that entity
        // stays in same place visually

        // XXX: Expand dropEntity in scene tree if not root
        // XXX: Focus dragEntity in scene tree

        this.update();
      }
      else {
        event.dataTransfer.dropEffect = "";
      }
    },

    selectByPath(path: string) {
      const entityData = this.getEntityDataByPath(path)
      if (entityData) {
        this.select(entityData, path);
      }
    },

    getEntityDataByPath(path: string) {
      return this.visitEntityDataPath(path, (e) => e);
    },

    visitEntityDataPath<T>(path: string, cb: (entityData: EntityData, parentEntityData: EntityData | null) => T): T | null {
      const pathParts = path.split(/\//);
      let parentNode: EntityData | null = null;
      let children = this.entities;
      for (let i = 0; i < pathParts.length; i++) {
        let leafNode = children.find(node => node.name === pathParts[i]);
        if (!leafNode) {
          break;
        }
        if (i === pathParts.length - 1) {
          return cb(leafNode, parentNode);
        }
        if (!leafNode.children || !leafNode.children.length) {
          break;
        }
        children = leafNode.children;
        parentNode = leafNode;
      }
      return null;
    },

    updateEntityName() {
      const newName = this.selectedEntityData.name;
      if (newName != this.selectedEntity.name) {
        this.selectedEntity.name = newName;
        this.selectedEntityPath = this.selectedEntity.path;
        this.update();
      }
    },

    createPrefab(item) {
      // Create a new file with this entity's configuration, including
      // children
      const entity = this.scene.getEntityByPath(item.path);
      const eData = entity.freeze();
      const eName = eData.path.split('/').slice(0, -1)[0];
      let filename = eName + '.json';
      let suffix = 1;
      while (this.project.assets.includes(filename)) {
        filename = eName + (suffix++) + '.json';
      }
      // Don't write the file yet, just open a new tab on the prefab
      // editor
      this.openTab({
        src: filename,
        name: filename.replace('.json', ''),
        component: "PrefabEdit",
        ext: '.json',
        data: eData,
        edited: true,
      });
    },

    update() {
      this.$emit('update:modelValue', this.entities);
    },
  },
});
</script>

<template>
  <div class="scene-panel">
    <div class="scene-toolbar">
      <MenuButton data-test="new-entity" placement="left-start">
        <template #title>
          <i class="fa fa-file-circle-plus"></i>
          New Entity
        </template>
        <ul>
          <li @click="addEntity('Transform')">Blank</li>
          <li class="hr">
            <hr>
          </li>
          <li @click="addEntity('Transform', 'Sprite')">Sprite</li>
          <li @click="addEntity('Transform', 'OrthographicCamera')">Orthographic Camera</li>
          <li class="hr">
            <hr>
          </li>
          <li @click="addEntity('Transform', 'UIElement')">UI Element</li>
          <li @click="addEntity('Transform', 'UIElement', 'UIImage')">UI Image</li>
          <li @click="addEntity('Transform', 'UIElement', 'UIText')">UI Text</li>
          <li @click="addEntity('Transform', 'UIElement', 'UIText', 'UIButton')">UI Button</li>
        </ul>
      </MenuButton>
    </div>
    <div class="scene-tree">
      <Tree ref="tree" v-for="entityData in entities" :key="entityData.name" :node="entityData" :onclick="select"
        :ondragstart="dragStart" :ondragover="dragOverEntity" :ondrop="dropEntity" default-type="Entity">
        <template #menu="{ node: entityData, path }">
          <MenuButton>
            <template #button>
              <i data-test="entity-menu" class="fa-solid fa-ellipsis-vertical scene-tree-item-menu-button"></i>
            </template>
            <ul>
              <li @click.stop.prevent="createPrefab(entityData)">Create Prefab</li>
              <li data-test="duplicate" @click.stop.prevent="duplicateEntity(entityData)">Duplicate</li>
              <li data-test="delete" @click.stop.prevent="deleteEntity(path)">Delete</li>
            </ul>
          </MenuButton>
        </template>
      </Tree>
    </div>
    <div class="entity-pane" v-if="selectedEntityData">
      <h5 data-test="entity-type">{{ selectedEntityData.type || "Unknown Type" }}</h5>
      <div class="d-flex justify-content-between align-items-center">
        <label class="me-1">Name</label>
        <input name="name" class="flex-fill text-end col-1" v-model="selectedEntityData.name" @change="updateEntityName"
          pattern="^[^/]+$" />
      </div>
      <div class="d-flex justify-content-between align-items-center">
        <label class="me-1">Active</label>
        <div class="flex-fill text-end col-1">
          <input name="active" type="checkbox" @change="updateActive" v-model="selectedEntityData.active" />
        </div>
      </div>
      <div v-for="name in selectedEntityComponents" :data-component="name" class="component-form">
        <div class="mb-1 d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center">
            <h6 class="m-0">{{ name }}</h6>
            <i v-if="!components[name]" class="ms-1 fa fa-file-circle-question" title="Component not found"></i>
          </div>
          <i data-test="remove" @click="removeComponent(name)" class="fa fa-close me-1 icon-button"></i>
        </div>
        <div v-if="componentForms[name]" class="component-form__body">
          <component :is="componentForms[name]" v-model="selectedEntityData.components[name]"
            @update:modelValue="updateComponent(name, $event)" :scene="scene" />
        </div>
      </div>
      <MenuButton class="button-center" data-test="add-component" title="Add Component...">
        <ul>
          <li v-for="c in availableComponents" :data-add-component="c" :class="hasComponent(c) ? 'disabled' : ''"
            @click="addComponent(c)">
            {{ c }}
          </li>
        </ul>
      </MenuButton>
    </div>
  </div>
</template>

<style>
.scene-panel {
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

.entity-drop,
.entity-drop-top,
.entity-drop-child {
  position: relative;
}

.entity-drop::before,
.entity-drop-top::before,
.entity-drop-child::before {
  content: '';
  display: block;
  left: 0;
  right: 0;
  height: 5px;
  position: absolute;
  background: repeating-linear-gradient(to right,
      #69b6d5ff,
      #69b6d5ff 10px,
      #69b6d500 10px,
      #69b6d500 20px);
}

.entity-drop::before,
.entity-drop-child::before {
  top: calc(100% - 2.5px);
}

.entity-drop-child::before {
  left: 25%;
}

.entity-drop-top::before {
  bottom: calc(100% - 2.5px);
}

.button-center {
  display: block;
  margin-left: auto;
  margin-right: auto;
  width: fit-content;
}
</style>
