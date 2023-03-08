import type { Config } from 'jest';
const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  silent: false,
  verbose: true,
  useStderr: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!three/examples/jsm/.*)',
  ],
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
    'node_modules/three/examples/jsm/.+\\.js$': 'babel-jest',
  },
};
export default config;
