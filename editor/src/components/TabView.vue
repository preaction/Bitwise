<script lang="ts">
let instanceNumber = 0;
</script>
<script setup lang="ts">
import { ref, onMounted } from 'vue';

type TabInfo = {
  id: string,
  label: string,
  panelId: string,
  selected: boolean,
}

const props = defineProps<{
  id?: string
}>();

const id = props.id || `tabview-${instanceNumber++}`;
const tabview = ref<HTMLDivElement | null>(null);
const panelContainer = ref<HTMLDivElement | null>(null);
const tabs = ref<Array<TabInfo>>([]);

function showTab(i: number) {
  tabs.value.forEach(t => {
    t.selected = false
    if (tabview.value) {
      tabview.value.querySelector(`#${t.panelId}`)?.setAttribute('hidden', 'true');
    }
  });
  tabs.value[i].selected = true;
  tabview.value?.querySelector(`#${tabs.value[i].panelId}`)?.removeAttribute('hidden');
}

onMounted(() => {
  if (!panelContainer.value) {
    return;
  }
  let firstShowingPanel;
  for (let i = 0; i < panelContainer.value.children.length; i++) {
    const panel = panelContainer.value.children[i];
    if (!panel.getAttribute('id')) {
      panel.setAttribute('id', `${id}-${i}-panel`);
    }
    // Keep track of the first panel we see that is "showing", we'll
    // select it later.
    if (typeof firstShowingPanel === 'undefined' && !panel.getAttribute('hidden')) {
      firstShowingPanel = i;
    }
    // Hide all the panels, we'll show one of them at the end.
    panel.setAttribute('hidden', 'hidden');
    tabs.value[i] = {
      id: `${panel.id}-label`,
      label: panel.getAttribute('aria-label') ?? '',
      panelId: panel.id,
      selected: false,
    };
    panel.setAttribute('aria-labelledby', tabs.value[i].id);
    panel.setAttribute('role', 'tabpanel');
  }
  showTab(firstShowingPanel ?? 0);
})
</script>

<template>
  <div :id="id" ref="tabview" class="tabview">
    <ul role="tablist">
      <li v-for="tab, i in tabs" role="tab" :aria-controls="tab.panelId" :id="tab.id"
        :aria-selected="tab.selected || undefined" @click="showTab(i)">
        {{ tab.label }}
      </li>
    </ul>
    <div ref="panelContainer" class="tabpanel">
      <slot />
    </div>
  </div>
</template>

<style>
.tabview {
  display: flex;
  flex-direction: column;
}

.tabview [role=tablist] {
  flex: 0 0 auto;
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tabview .tabpanel {
  flex: 1 1 auto;
}

.tabview [role=tab] {
  padding: 0.1em;
  margin: 0.1em 0.2em 0;
  border: 1px solid var(--bw-border-color);
}

.tabview [role=tab][aria-selected] {
  background: var(--bw-border-color);
  border-color: var(--bw-border-color-focus);
  border-bottom-color: var(--bw-border-color);
}
</style>
