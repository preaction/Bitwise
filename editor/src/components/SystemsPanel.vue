<script setup lang="ts">
import type { Scene, SceneData } from '@fourstar/bitwise';
import { computed, inject, toRaw } from 'vue'
import MenuButton from './MenuButton.vue';

const props = defineProps<{ scene: Scene, modelValue: SceneData }>();
const emits = defineEmits<{
  (e: 'update:modelValue', v: SceneData): void,
  (e: 'update'): void,
}>();
const systems = computed(() => {
  return props.scene?.game?.systems || [];
});

const availableSystems = computed(() => {
  return Object.keys(systems.value).filter(s => !systems.value[s].isNull && !s.match(/^Editor/));
});

const systemForms = inject('systemForms');

function updateSystem(idx: number, data: Object) {
  props.modelValue.systems[idx].data = data;
  props.scene.systems[idx].thaw(data);
  update();
}

function startDragSystem(event: DragEvent, index) {
  event.dataTransfer.setData("bitwise/system", index);
}

function dragOverSystem(event, index) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  // XXX: Show drop indicator
}

function dropSystem(event, index) {
  const data = event.dataTransfer.getData("bitwise/system");
  if (data) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const systemData = props.modelValue.systems.splice(data, 1);
    props.modelValue.systems.splice(index, 0, ...systemData);
    const system = props.scene.systems.splice(data, 1);
    props.scene.systems.splice(index, 0, ...system);
    update();
  }
}

function hasSystem(name: string) {
  return !!props.modelValue?.systems?.find(s => s.name === name);
}

function addSystem(name: string) {
  if (hasSystem(name)) {
    return;
  }
  props.scene.addSystem(name);
  props.modelValue.systems.push({
    name,
    data: props.scene.systems[props.scene.systems.length - 1].freeze(),
  });
  update();
}

function removeSystem(idx: number) {
  props.modelValue.systems.splice(idx, 1);
  props.scene.systems.splice(idx, 1);
  update();
}

function update() {
  emit('update:modelValue', {
    ...toRaw(props.modelValue),
    name: props.modelValue.name,
  });
  emit('update');
}
</script>

<template>
  <div v-if="modelValue?.systems">
    <div v-for="s, idx in modelValue.systems" :key="s.name" class="system-form">
      <div class="mb-1 d-flex justify-content-between align-items-center" draggable="true"
        @dragstart="startDragSystem($event, idx)" @dragover="dragOverSystem($event, idx)"
        @drop="dropSystem($event, idx)">
        <div class="d-flex align-items-center">
          <h6 class="m-0"><i class="fa fa-ellipsis-vertical system-move"></i><i
              class="fa fa-ellipsis-vertical system-move"></i> {{ s.name }}</h6>
          <i v-if="s.isNull" class="ms-1 fa fa-file-circle-question" title="System not found"></i>
        </div>
        <i @click="removeSystem(idx)" class="fa fa-close me-1 icon-button"></i>
      </div>
      <div v-if="systemForms[s.name]" class="system-form__body">
        <component :is="systemForms[s.name]" v-model="s.data" :scene="scene" @update="updateSystem(idx, $event)" />
      </div>
    </div>
    <MenuButton class="button-center" title="Add System...">
      <ul>
        <li v-for="s in availableSystems" :class="hasSystem(s) ? 'disabled' : ''" @click="addSystem(s)">{{ s }}</li>
      </ul>
    </MenuButton>
  </div>
</template>
