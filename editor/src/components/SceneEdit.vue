<script lang="ts">
import { defineComponent, toRaw, markRaw, reactive } from "vue";
import type { System, EntityData, Game, SceneData, Entity } from '@fourstar/bitwise';
import EntityPanel from './EntityPanel.vue';
import Tab from "../model/Tab";
import TabView from './TabView.vue';
import Panel from './Panel.vue';
import SystemsPanel from "./SystemsPanel.vue";

/**
 * SceneEdit is the scene editor tab. The scene JSON file contains the
 * systems config and entities (with entity component configs). This
 * data is used to build two Bitwise scenes: One for editing and one for
 * playing.
 *
 * The editing scene loads only the entity data. This scene uses special
 * systems to enable editing behaviors and report information back to the
 * SceneEdit tab. In essense, it's a game that edits the game. Changes
 * made to the editing scene are copied back to the scene JSON file data.
 *
 * The playing scene loads all the data, including systems. It also adds
 * an additional system for reporting information back to the SceneEdit
 * tab. Changes made to the playing scene are displayed in the editor
 * but not copied back to the scene JSON file data.
 */
export default defineComponent({
  components: {
    EntityPanel,
    TabView,
    Panel,
    SystemsPanel,
  },
  props: {
    modelValue: {
      type: Tab,
      required: true,
    },
  },
  emits: ['update'],
  data() {
    return {
      sceneData: null,
      loadPromise: Promise.resolve(),
      loading: true,
      playing: false,
      paused: false,
      gameClass: null,
      editGame: null,
      editScene: null,
      editReady: false,
      playGame: null,
      playScene: null,
      playReady: false,
      showGrid: false,
    } as {
      sceneData: (SceneData & { component: string, editor: any }) | null,
      loadPromise: Promise<any>,
      loading: boolean,
      playing: boolean,
      paused: boolean,
      gameClass: any,
      editGame: any,
      editScene: any,
      editReady: boolean,
      playGame: any,
      playScene: any,
      playReady: boolean,
      showGrid: boolean,
    };
  },

  inject: ['project', 'isBuilding', 'baseUrl', 'backend'],

  async created() {
    if (this.modelValue.src) {
      this.loadPromise = this.modelValue.readFile();
    }
    else {
      this.loadPromise = Promise.resolve('{}');
    }
  },

  async mounted() {
    try {
      this.sceneData = reactive(JSON.parse(await this.loadPromise));
    }
    catch (err) {
      console.log(`Error loading scene data: ${err}`);
    }
    if (!this.sceneData || Object.keys(this.sceneData).length <= 0) {
      this.initializeScene();
      this.update({ name: 'NewScene', ext: '.json' });
    }

    // Update sceneData for new formattings
    if (this.sceneData && !this.sceneData.$schema) {
      // Original data format was flattened array of entities, new
      // format is tree of entities
      if (this.sceneData.entities?.length) {
        const newEntities = [] as Array<EntityData>;
        // @ts-ignore
        for (const entity of this.sceneData.entities.sort((a, b) => a.path > b.path ? 1 : a.path < b.path ? -1 : 0)) {
          // @ts-ignore
          if (!entity.path.match('/')) {
            // @ts-ignore
            entity.name = entity.path;
            // @ts-ignore
            delete entity.path;
            newEntities.push(entity);
            continue;
          }

          let children = this.sceneData.entities
          // @ts-ignore
          const pathParts = entity.path.split('/');
          // @ts-ignore
          delete entity.path;
          entity.name = pathParts[pathParts.length - 1];
          for (let i = 0; i < pathParts.length - 1; i++) {
            let ancestorEntity = children.find(node => node.name === pathParts[i]);
            if (ancestorEntity) {
              children = ancestorEntity.children ||= [];
            }
          }
          children.push(entity);
        }
        this.sceneData.entities = newEntities;
      }

      this.sceneData.$schema = '1';
    }

    this.initializeEditor();
  },

  unmounted() {
    if (this.playing) {
      this.stop();
    }
    this.editGame.stop();
  },

  computed: {
    edited(): boolean {
      return this.modelValue.edited;
    },
    scene() {
      return this.playing ? this.playScene : this.editScene;
    },
  },

  watch: {
    isBuilding(isBuilding) {
      if (isBuilding) {
        this.editReady = false;
        this.playReady = false;
        // XXX: Restoring the playState of the scene only works if all
        // of the Systems know how to do it right, and I'm not sure
        // I know how to do it right: init() creates a set of objects,
        // but then thaw() creates a wholly different set of objects...
        /* if ( this.playing ) {
          this.playState = this.playScene.freeze();
        } */
      }
      else {
        // Start the current pane again
        if (this.playing) {
          this.play(this.playState);

          // Clear out the current edit game. If the game is playing, the
          // editor will be reinitialized when the game stops.
          this.editGame.stop();
          this.editGame = undefined;
        }
        else {
          this.initializeEditor();
        }
      }
    },
  },

  methods: {
    initializeScene() {
      this.sceneData = reactive({
        $schema: '1',
        name: 'NewScene',
        component: 'SceneEdit',
        components: [
          'Transform', 'Sprite', 'OrthographicCamera', 'RigidBody',
          'BoxCollider', 'UI',
        ],
        systems: [
          { name: 'Input', data: {} },
          { name: 'Physics', data: {} },
          { name: 'Render', data: {} },
        ],
        entities: [
          {
            $schema: '1',
            name: "Camera",
            type: "Camera",
            active: true,
            components: {
              Transform: {
                z: 2000,
                rw: 1,
                sx: 1,
                sy: 1,
                sz: 1,
              },
              OrthographicCamera: {
                frustum: 10,
                zoom: 1,
                near: 0,
                far: 2000,
              },
            },
          },
        ],
      });
    },

    async initializeEditor() {
      if (this.isBuilding) {
        console.log('initializeEditor: waiting until build is finished...');
        return;
      }
      this.gameClass = await this.project.loadGameClass();
      const game = this.editGame = this.createEditorGame('edit-canvas');

      const scene = this.editScene = markRaw(game.addScene());
      await this.thawEditScene(this.sceneData);

      const editor = this.editScene.getSystem(game.systems.EditorRender);
      editor.addEventListener('updateEntity', this.updateEntityData.bind(this));
      editor.addEventListener('selectionChanged', this.selectionChanged.bind(this));
      this.showGrid = !!editor.grid;

      // The editor canvas must be visible when the game is started so
      // that the renderer is created at the correct size. If the canvas
      // is not visible, the renderer will think it has a canvas with
      // 0 width and 0 height.
      this.$nextTick(async () => {
        this.editGame.start();
        try {
          await scene.init();
          scene.start();
          scene.update(0);
        }
        catch (err) {
          console.log(`Error calling update(): `, err);
        }
        try {
          scene.render();
        }
        catch (err) {
          console.log(`Error calling render(): `, err);
        }
        this.editReady = true;
      });
    },

    async thawEditScene(sceneData: any) {
      // Editor scene gets its own systems
      const systems = [
        { name: 'Input', data: {} },
        { name: 'EditorRender', data: sceneData?.editor },
      ];
      if (sceneData.systems.find((sys: System) => sys.name === 'Physics')) {
        systems.push({ name: 'EditorPhysics', data: {} });
      }
      try {
        await this.editScene.thaw({
          ...sceneData,
          systems,
        });
      }
      catch (e) {
        console.log(`Error thawing scene: ${e}`);
      }
    },

    // The player game is sized according to the game settings and uses
    // the runtime systems
    createPlayerGame(canvas: string, opt: Object): Game {
      const game = new this.gameClass({
        canvas: this.$refs[canvas],
        loader: {
          base: this.baseUrl,
        },
        ...opt,
      });

      for (const name in this.components) {
        game.registerComponent(name, this.components[name]);
      }
      for (const name in this.systems) {
        // XXX: Systems should have a class method that returns the
        // editor version of the system. Using naming conventions is
        // bad and I should feel bad.
        if (name.match(/^Editor/)) {
          continue;
        }
        game.registerSystem(name, this.systems[name]);
      }

      return markRaw(game);
    },

    // The editor game is sized to fit the screen and uses some custom
    // editor systems.
    createEditorGame(canvas: string, opt: Object = {}): Game {
      const game = new this.gameClass({
        canvas: this.$refs[canvas],
        loader: {
          base: this.baseUrl,
        },
        // Editor game should auto-size, so set width/height 0
        renderer: {
          width: 0,
          height: 0,
        },
        ...opt,
      });
      game.data = {
        gameWidth: game.config?.renderer?.width ?? 1280,
        gameHeight: game.config?.renderer?.height ?? 720,
      };

      for (const name in this.components) {
        game.registerComponent(name, this.components[name]);
      }
      for (const name in this.systems) {
        if (!name.match(/^Editor/)) {
          continue;
        }
        let system = this.systems[name];
        game.registerSystem(name, system);
      }

      return markRaw(game);
    },

    getEntityDataByPath(path: string) {
      if (!this.sceneData) {
        return;
      }
      const pathParts = path.split(/\//);
      let children = this.sceneData.entities;
      for (let i = 0; i < pathParts.length; i++) {
        let leafNode = children.find(node => node.name === pathParts[i]);
        if (!leafNode) {
          return null;
        }
        if (i === pathParts.length - 1) {
          return leafNode;
        }
        children = leafNode.children;
      }
    },

    updateEntityData({ eid, components }: { eid: number, components: { [key: string]: any } }) {
      const entity = this.scene.getEntityById(eid);
      const entityData = this.getEntityDataByPath(entity.path);
      if (!entityData) {
        return;
      }
      entityData.components ??= {}
      for (const [componentName, componentData] of Object.entries(components)) {
        for (const [propertyName, propertyValue] of
          Object.entries(componentData)) {
          entityData.components[componentName][propertyName]
            = propertyValue;
        }
      }
      this.update();
    },

    selectionChanged({ eids }: { eids: number[] }) {
      const eid = eids[eids.length - 1];
      if (!eid) {
        return;
      }
      const entity = this.scene.getEntityById(eid);
      (this.$refs.entityPanel as typeof EntityPanel).selectByPath(entity.path);
    },

    sceneChanged() {
      try {
        this.scene.update(0);
      }
      catch (err) {
        console.log(`Error calling update(): `, err);
      }
      this.scene.render();
      if (!this.playing) {
        this.update();
      }
    },

    update(tabProps: any = {}) {
      this.$emit('update', {
        edited: true,
        ...tabProps,
      });
    },

    async save() {
      try {
        await this.modelValue.writeFile(JSON.stringify(toRaw(this.sceneData), null, 2));
      }
      catch (error) {
        console.log('error writing file', error);
      }
      this.$emit('update', {
        ...this.modelValue,
        edited: false,
      });
    },

    async play(playState) {
      this.playState = playState ||= this.sceneData;

      if (this.playGame) {
        this.stop()
      }

      this.playGame = this.createPlayerGame('play-canvas');
      const scene = this.playScene = markRaw(this.playGame.addScene());
      await scene.thaw(playState);

      this.playing = true;
      this.paused = false;
      this.$nextTick(async () => {
        this.playGame.start();
        // XXX: Show a rudimentary loading screen during init
        await this.playScene.init();
        this.playScene.start();
        this.playReady = true;
        this.$refs['play-canvas'].focus();
      });
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

      // If the editor was hidden while the game was reloaded, we need
      // to re-initialize it in order to get the correct canvas size.
      if (!this.editGame) {
        this.initializeEditor();
      }
    },

    ondelete(event: KeyboardEvent, update: boolean = true) {
      if (!this.editScene || event.target !== this.$refs['edit-canvas']) {
        return;
      }
      event.preventDefault();
      const scene = this.editScene;
      const editor = scene.getSystem(this.editGame.systems.EditorRender);
      const eids: number[] = editor.getSelectedEntityIds();
      eids.forEach(eid => scene.removeEntity(eid));
      editor.clearSelected();
      if (update) {
        try {
          scene.update(0);
        }
        catch (err) {
          console.log(`Error calling update(): `, err);
        }
        scene.render();
        this.update();
      }
    },

    oncut(event: KeyboardEvent) {
      if (!this.editScene || event.target !== this.$refs['edit-canvas']) {
        return;
      }
      event.preventDefault();
      this.oncopy(event);
      this.ondelete(event);
    },

    oncopy(event: KeyboardEvent) {
      if (!this.editScene || event.target !== this.$refs['edit-canvas']) {
        return;
      }
      event.preventDefault();
      const scene = this.editScene;
      const editor = scene.getSystem(this.editGame.systems.EditorRender);
      const eids: number[] = editor.getSelectedEntityIds();
      const frozenEntities = eids.map(eid => scene.entities[eid].freeze());
      // Clear the path so they are put at the root
      frozenEntities.forEach(e => delete e.path);
      const blob = new Blob(
        [JSON.stringify({ type: 'bitwise/entity', items: frozenEntities }, null, 2)],
        {
          type: "text/plain",
        },
      );
      navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
    },

    async onpaste(event: KeyboardEvent) {
      if (!this.editScene || event.target !== this.$refs['edit-canvas']) {
        return;
      }
      event.preventDefault();
      const scene = this.editScene;

      const clipboardItems = await navigator.clipboard.read();
      let frozenEntities = [];
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          const blob = await clipboardItem.getType(type);
          const clipItem = JSON.parse(await blob.text());
          frozenEntities = clipItem.items;
        }
      }

      // If entities are selected, we are replacing them. Delete
      // them first.
      this.ondelete(event, false);
      for (const eData of frozenEntities) {
        while (scene.getEntityByPath(eData.name)) {
          const endNum = eData.name.match(/(\d+)$/)?.[0];
          const suffix = endNum >= 0 ? parseInt(endNum) + 1 : " 1";
          const namePrefix = eData.name.replace(/\d+$/, "");
          eData.name = namePrefix + suffix;
        }
        const entity = scene.addEntity();
        await entity.thaw(eData);
      }
      try {
        scene.update(0);
      }
      catch (err) {
        console.log(`Error calling update(): `, err);
      }
      scene.render();
      this.update();
    },

    toggleGrid() {
      const editor = this.editScene.getSystem(this.editGame.systems.EditorRender);
      this.showGrid = this.showGrid ? false : true;
      editor.showGrid(this.showGrid);
      editor.snapToGrid = this.showGrid;
      if (this.sceneData) {
        this.sceneData.editor = editor.freeze();
      }
      this.update();
    },
  },

});
</script>

<template>
  <div class="scene-edit">
    <div class="tab-toolbar">
      <div class="btn-toolbar" role="toolbar" aria-label="Scene editor toolbar">
        <button type="button" class="btn btn-outline-dark btn-sm me-2" :disabled="!edited" @click="save"
          data-test="save">
          <i class="fa fa-save"></i>
        </button>
        <div class="btn-group me-2" role="group" aria-label="Play/pause">
          <button type="button" class="btn btn-sm" data-test="stop"
            :class="!playing ? 'btn-danger' : 'btn-outline-danger'" :disabled="!playing" @click="stop">
            <i class="fa fa-stop"></i>
          </button>
          <button type="button" class="btn btn-sm" data-test="play"
            :class="playing && !paused ? 'btn-success' : 'btn-outline-success'" :disabled="playing && !paused"
            @click="play()">
            <i class="fa fa-play"></i>
          </button>
          <button type="button" class="btn btn-sm" data-test="pause"
            :class="playing && paused ? 'btn-warning' : 'btn-outline-warning'"
            :disabled="!playing || (playing && paused)" @click="pause">
            <i class="fa fa-pause"></i>
          </button>
        </div>
        <div class="btn-toolbar me-2" aria-label="Grid controls">
          <button type="button" :aria-pressed="showGrid" class="btn btn-sm" data-test="toggle-grid"
            :class="showGrid ? 'btn-dark' : 'btn-outline-dark'" @click="toggleGrid()">
            <i class="fa fa-border-all"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="tab-main-edit" v-show="playing == false">
      <div v-if="!editReady" class="build-overlay"><i class="fa fa-cog fa-spin fa-10x"></i></div>
      <canvas ref="edit-canvas" />
    </div>
    <div class="tab-main-play" v-show="playing == true">
      <div v-if="!playReady" class="build-overlay"><i class="fa fa-cog fa-spin fa-10x"></i></div>
      <canvas ref="play-canvas" />
    </div>
    <div class="tab-sidebar">
      <TabView>
        <Panel label="Entities" style="height: 100%">
          <EntityPanel ref="entityPanel" v-if="sceneData" class="tab-sidebar-item" @update:modelValue="sceneChanged"
            v-model="sceneData.entities" :scene="scene" />
        </Panel>
        <Panel label="Systems" style="height: 100%">
          <SystemsPanel v-if="scene" v-model="sceneData" @update="sceneChanged" :scene="scene" />
        </Panel>
      </TabView>
    </div>
  </div>
</template>

<style>
.scene-edit {
  display: grid;
  place-content: stretch;
  grid-template-rows: auto 1fr;
  grid-template-columns: 1fr minmax(0, auto);
  grid-template-areas: "toolbar sidebar" "main sidebar";
  height: 100%;
  overflow: hidden;
}

.tab-toolbar {
  grid-area: toolbar;
  color: var(--bw-color);
  background: var(--bw-border-color);
  border: 2px outset var(--bw-color);
  border-radius: 4px;
  padding: 0.1em;
}

.tab-sidebar {
  /* XXX: Allow changing sidebar width */
  --tab-sidebar-width: auto;
  grid-area: sidebar;
  width: 17vw;
  max-width: 17vw;
  transition: width 0.2s;
  display: flex;
  flex-flow: column;
  height: 100%;
  overflow: hidden;
}

.tab-sidebar .tabview {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.tab-sidebar .tabpanel {
  padding: 0.3em;
  background: var(--bw-border-color);
  color: var(--bw-color);
  overflow: hidden;
  height: 100%;
}

.tab-main-edit {
  position: relative;
  grid-area: main;
  align-self: stretch;
  justify-self: stretch;
  height: 100%;
  overflow: hidden;
}

.tab-main-play {
  position: relative;
  grid-area: main;
  align-self: center;
  justify-self: center;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.build-overlay {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  text-align: center;
  z-index: 2;
}

.build-overlay>* {
  flex: 1 1 100%;
  color: var(--bs-light);
}
</style>
