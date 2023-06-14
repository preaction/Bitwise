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
import InputGameObject from './components/InputGameObject.vue';
import BinaryToggle from './components/BinaryToggle.vue';

const backend = new ElectronBackend();

const app = createApp(App, { backend });
app.config.unwrapInjectedRef = true;

app.use(BootstrapVue3)
  // XXX: These are components that are used in custom editor
  // components. We should probably find a better way to register these.
  .component( 'InputGameObject', InputGameObject )
  .component( 'BinaryToggle', BinaryToggle );

const component = app.mount('#app');
component.$nextTick(() => {
  postMessage({ payload: 'removeLoading' }, '*')
});
