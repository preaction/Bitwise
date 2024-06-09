'use strict';

const path = require('path');
const fs = require('fs/promises');

module.exports = {
  packagerConfig: {
    asar: true,
    prune: false,
    icon: '../images/icon',
    overwrite: true,
    extraResource: [
      '../examples',
    ],
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "Bitwise Editor"
      }
    },
    {
      name: "@electron-forge/maker-dmg"
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['linux'],
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'preaction',
          name: 'bitwise'
        },
        prerelease: true,
        draft: true,
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    },
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.config.ts',
          },
        ],
      },
    },
  ],
  hooks: {
    postMake: async (_, results) => {
      for (const result of results) {
        for (const artifact of result.artifacts) {
          console.log(artifact);
        }
      }
    }
  },
};
