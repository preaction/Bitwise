import type { Config } from 'jest';

const common: Config = {
  preset: 'ts-jest/presets/js-with-babel-esm',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^bfile://(.+)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!three/examples/jsm/.*)',
  ],
  moduleFileExtensions: ['vue', 'js', 'ts', 'mts'],
  extensionsToTreatAsEsm: ['.ts', '.mts'],
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.m?tsx?$': [
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
      "testMatch": ["**/test/unit/electron/**/?(*.)+(spec|test).[jt]s?(x)"],
      "testPathIgnorePatterns": ["<rootDir>/out"],
      "runner": "@kayahr/jest-electron-runner/main",
      "testEnvironment": "node",
    },
    {
      ...common,
      "testMatch": ["**/test/unit/src/**/?(*.)+(spec|test).[jt]s?(x)"],
      "testPathIgnorePatterns": ["<rootDir>/out"],
      "testEnvironment": "jest-environment-jsdom",
      "testEnvironmentOptions": {
        "customExportConditions": ["node", "node-addons"],
      },
    },
  ],
};
export default config;

