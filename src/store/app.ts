
import { defineStore } from 'pinia';

interface State {
  component:{ [key:string]: { component: any, form: any } }
  action:{ [key:string]: any }
}

export const useAppStore = defineStore('app', () => {
  const state:State = {
    component: {},
    action: {},
  };

  return {
    ...state,
    registerComponent( name:string, component:any, form:any ) {
      state.component[name] = { component, form };
    },
    registerAction( name:string, action:any ) {
      state.action[name] = action;
    },
  };
});

