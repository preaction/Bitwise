import type { Config } from 'jest';

const common: Config = {
  preset: 'ts-jest/presets/default-esm',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!three/examples/jsm/.*)',
  ],
  moduleFileExtensions: ['vue', 'js', 'ts'],
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.app.json',
      },
    ],
    "^.+\\.vue$": "@vue/vue3-jest",
    'node_modules/three/examples/jsm/.+\\.js$': 'babel-jest',
  },
};

const config: Config = {
  silent: false,
  verbose: true,
  useStderr: true,
  "projects": [
    {
      ...common,
      "testMatch": ["**/test/unit/electron/**"],
      "testPathIgnorePatterns": ["<rootDir>/out"],
      "runner": "@kayahr/jest-electron-runner/main",
      "testEnvironment": "node",
    },
    {
      ...common,
      "testMatch": ["**/test/unit/src/**"],
      "testPathIgnorePatterns": ["<rootDir>/out"],
      "runner": "@kayahr/jest-electron-runner",
      "testEnvironment": "@kayahr/jest-electron-runner/environment",
    },
  ],
};
export default config;

