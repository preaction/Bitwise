<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapActions } from 'pinia';
import { useAppStore } from "../store/app.ts";
import ThreeJS from './ThreeJS.vue';

export default defineComponent({
  components: {
    ThreeJS,
  },
  props: ['modelValue', 'edited'],
  data() {
    return {
    };
  },
  mounted() {
    this.$emit( 'update:modelValue', this.$data );
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
      <ThreeJS />
    </div>
    <div class="tab-sidebar">
      <div>
        Scene Tree
      </div>
      <div>
        Component Editor
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
</style>
