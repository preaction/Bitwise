<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
import ObjectTreeItem from './ObjectTreeItem.vue';
import * as three from 'three';
import * as bitwise from '../Bitwise.ts';

import Position from './bitwise/Position.vue';
import OrthographicCamera from './bitwise/OrthographicCamera.vue';

export default defineComponent({
  components: {
    ObjectTreeItem,

    Position,
    OrthographicCamera,
  },
  props: ['modelValue', 'edited'],
  data() {
    return {
      path: '/',
      type: 'Scene',
      name: 'New Scene',
      children: [
        {
          name: 'Camera',
          type: 'OrthographicCamera',
          path: '/Camera',
          components: [
            {
              type: 'Position',
              data: {
                x: 0,
                y: 0,
                z: 4,
              },
            },
            {
              type: 'OrthographicCamera',
              data: {
                frustum: 2,
              },
            },
          ],
        },
      ],
      selectedEntity: null,
      ...this.modelValue,
    };
  },

  mounted() {
    this.game = new bitwise.Game({
      canvas: this.$refs['canvas'],
      loader: {
        base: this.getFileUrl(""),
      },
    });

    // XXX: Scroll controls for zoom
    // XXX: Pinch controls for zoom

    const scene = new bitwise.Scene( this.game );
    this.game.scenes.push( scene );
    this.game.start();
    scene.start();

    this.$emit( 'update:modelValue', this.$data );
  },

  unmounted() {
    this.game.stop();
  },

  methods: {
    ...mapActions( useAppStore, ['getFileUrl'] ),
    update() {
      this.$emit('update:modelValue', {
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
        <ObjectTreeItem v-bind="$data" :expand="true" @select="select" />
      </div>
      <div v-if="selectedEntity">
        <div>{{ selectedEntity.type }}</div>
        <label>Name:
          <input v-model="selectedEntity.name" />
        </label>
        <div v-for="c in selectedEntity.components">
          <component :is="c.type" v-bind="c.data" />
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
