/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare global {
  interface Window {
    electron: {
      store: {
        get: (file: string, key: string, default?: any) => any;
        set: (file: string, key: string, val: any) => void;
        // any other methods you've defined...
      };
    };
  }
}
