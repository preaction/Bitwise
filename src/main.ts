import { createApp } from 'vue';
import { createPinia } from 'pinia';
import BootstrapVue3 from 'bootstrap-vue-3';

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import App from './App.vue';
import * as VueRouter from 'vue-router';
import routes from './route.ts';

const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes,
});

const pinia = createPinia()

createApp(App)
  .use(router)
  .use(pinia)
  .use(BootstrapVue3)
  .mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  });
