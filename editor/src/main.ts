import { createApp } from 'vue';
import { createPinia } from 'pinia';
import BootstrapVue3 from 'bootstrap-vue-3';

import 'bootstrap/dist/js/bootstrap.bundle.js';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css';
import '@fortawesome/fontawesome-free/css/fontawesome.css';
import '@fortawesome/fontawesome-free/css/solid.css';

import App from './App.vue';

// Globally-registered components
import InputGameObject from './components/InputGameObject.vue';
import BinaryToggle from './components/BinaryToggle.vue';

const pinia = createPinia()

createApp(App)
  .use(pinia)
  .use(BootstrapVue3)
  .component( 'InputGameObject', InputGameObject )
  .component( 'BinaryToggle', BinaryToggle )
  .mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  });
