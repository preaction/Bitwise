import { createApp } from 'vue';
import BootstrapVue3 from 'bootstrap-vue-3';
import ElectronBackend from './backend/Electron.js';

import 'bootstrap/dist/js/bootstrap.bundle.js';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css';
import '@fortawesome/fontawesome-free/css/fontawesome.css';
import '@fortawesome/fontawesome-free/css/solid.css';

import App from './App.vue';

// Globally-registered components
// XXX: When we switch to using generated forms for game systems and
// components, we can forgoe this global registration.
import InputAsset from './components/InputAsset.vue';
import InputEntity from './components/InputEntity.vue';
import BinaryToggle from './components/BinaryToggle.vue';

const backend = new ElectronBackend();

const app = createApp(App, { backend });
app.config.unwrapInjectedRef = true;

app.use(BootstrapVue3)
  // XXX: These are components that are used in custom editor
  // components. We should probably find a better way to register these.
  .component('InputAsset', InputAsset)
  .component('InputEntity', InputEntity)
  .component('BinaryToggle', BinaryToggle);

const component = app.mount('#app');
component.$nextTick(() => {
  postMessage({ payload: 'removeLoading' }, '*')
});
